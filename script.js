(() => {
  "use strict";

  document.documentElement.classList.add("js");

  const config = window.SVETLAB_CONFIG;
  if (!config) return;

  const { contacts, site, analytics } = config;
  const modal = document.getElementById("project-modal");
  const modalPanel = modal?.querySelector(".modal-panel");
  const requestForm = document.getElementById("request-form");
  const taskField = requestForm?.querySelector('[name="task"]');
  const cityField = requestForm?.querySelector('[name="city"]');
  const menuButton = document.querySelector(".menu-button");
  const mobileMenu = document.getElementById("mobile-menu");
  const fixedCta = document.querySelector(".mobile-fixed-cta");
  const toast = document.getElementById("toast");
  const year = document.getElementById("year");
  let lastModalTrigger = null;
  let lastMenuTrigger = null;
  let toastTimer = 0;

  if (year) year.textContent = String(new Date().getFullYear());

  const params = new URLSearchParams(window.location.search);
  const attribution = Object.freeze({
    utm_source: params.get("utm_source") || "",
    utm_campaign: params.get("utm_campaign") || ""
  });

  function trackEvent(eventName, details = {}) {
    const payload = {
      event: eventName,
      placement: details.placement || "",
      channel: details.channel || "",
      page: window.location.pathname,
      ...attribution
    };

    window.dispatchEvent(new CustomEvent("svetlab:event", { detail: payload }));

    if (Array.isArray(window.dataLayer)) window.dataLayer.push(payload);
    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, {
        placement: payload.placement,
        channel: payload.channel,
        page: payload.page,
        utm_source: payload.utm_source,
        utm_campaign: payload.utm_campaign
      });
    }
    if (analytics.yandexMetricaId && typeof window.ym === "function") {
      window.ym(analytics.yandexMetricaId, "reachGoal", eventName, {
        placement: payload.placement,
        channel: payload.channel,
        page: payload.page
      });
    }
  }

  function getMessageValues() {
    return {
      task: String(taskField?.value || "").trim(),
      city: String(cityField?.value || "").trim()
    };
  }

  function buildMessage() {
    const { task, city } = getMessageValues();
    return [
      "Здравствуйте! Хочу получить расчёт по проекту.",
      "",
      `Задача: ${task || "уточню в сообщении"}`,
      `Город получения: ${city || "уточню позже"}`,
      "",
      "Материалы отправлю следующим сообщением."
    ].join("\n");
  }

  function buildEmailBody() {
    const { task, city } = getMessageValues();
    return [
      "Здравствуйте! Хочу получить расчёт по проекту.",
      "",
      `Задача: ${task}`,
      "Количество:",
      `Город получения: ${city}`,
      "",
      "Материалы приложу к письму."
    ].join("\n");
  }

  function updateChannelLinks() {
    const message = buildMessage();
    const emailBody = buildEmailBody();

    document.querySelectorAll('[data-channel="whatsapp"]').forEach((link) => {
      link.href = `https://wa.me/${contacts.whatsappPhone}?text=${encodeURIComponent(message)}`;
    });

    document.querySelectorAll('[data-channel="email"]').forEach((link) => {
      link.href = `mailto:${contacts.email}?subject=${encodeURIComponent(site.requestEmailSubject)}&body=${encodeURIComponent(emailBody)}`;
    });
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (_) {
      // Continue with the local fallback below.
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch (_) {
      copied = false;
    }
    textarea.remove();
    return copied;
  }

  function showToast(message) {
    if (!toast) return;
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    toastTimer = window.setTimeout(() => {
      toast.hidden = true;
    }, 3600);
  }

  function openExternal(url) {
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) window.location.href = url;
  }

  function closeMenu({ restoreFocus = true } = {}) {
    if (!mobileMenu || !menuButton || mobileMenu.hidden) return;
    mobileMenu.hidden = true;
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Открыть меню");
    document.body.classList.remove("menu-open");
    if (restoreFocus) (lastMenuTrigger || menuButton).focus();
  }

  function openMenu() {
    if (!mobileMenu || !menuButton) return;
    lastMenuTrigger = document.activeElement;
    mobileMenu.hidden = false;
    menuButton.setAttribute("aria-expanded", "true");
    menuButton.setAttribute("aria-label", "Закрыть меню");
    document.body.classList.add("menu-open");
    mobileMenu.querySelector("a")?.focus();
  }

  menuButton?.addEventListener("click", () => {
    if (mobileMenu?.hidden) openMenu();
    else closeMenu();
  });

  mobileMenu?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => closeMenu({ restoreFocus: false }));
  });

  mobileMenu?.addEventListener("click", (event) => {
    if (event.target === mobileMenu) closeMenu();
  });

  function openModal(trigger) {
    if (!modal || !modalPanel) return;
    const restoreTarget = trigger && mobileMenu?.contains(trigger) ? menuButton : (trigger || document.activeElement);
    closeMenu({ restoreFocus: false });
    lastModalTrigger = restoreTarget;
    modal.hidden = false;
    document.body.classList.add("modal-open");
    updateChannelLinks();
    const firstChannel = modal.querySelector(".modal-channels a, .modal-channels button");
    window.requestAnimationFrame(() => (firstChannel || modalPanel).focus());
    trackEvent("cta_click", { placement: trigger?.dataset.placement || "unknown" });
    trackEvent("contact_modal_open", { placement: trigger?.dataset.placement || "unknown" });
  }

  function closeModal() {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    document.body.classList.remove("modal-open");
    if (lastModalTrigger instanceof HTMLElement) lastModalTrigger.focus();
  }

  document.querySelectorAll("[data-open-modal]").forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      openModal(trigger);
    });
  });

  modal?.querySelectorAll("[data-close-modal]").forEach((control) => {
    control.addEventListener("click", closeModal);
  });

  [taskField, cityField].forEach((field) => field?.addEventListener("input", updateChannelLinks));

  document.addEventListener("click", (event) => {
    const channelControl = event.target.closest("[data-channel]");
    if (!channelControl) return;

    const channel = channelControl.dataset.channel;
    const placement = channelControl.dataset.placement || "direct";
    updateChannelLinks();
    trackEvent("contact_channel_click", { placement, channel });
    trackEvent(`${channel}_click`, { placement, channel });

    if (channel === "telegram") {
      event.preventDefault();
      const copyPromise = copyText(buildMessage());
      openExternal(contacts.telegramUrl);
      copyPromise.then((copied) => {
        showToast(copied ? "Текст запроса скопирован. Вставьте его в Telegram и приложите материалы." : `Откройте @${contacts.telegramUsername} и отправьте материалы.`);
      });
    }

    if (channel === "max") {
      event.preventDefault();
      copyText(`${contacts.maxPhoneDisplay}\n\n${buildMessage()}`).then((copied) => {
        showToast(copied ? `Номер MAX ${contacts.maxPhoneDisplay} и текст запроса скопированы.` : `Номер MAX: ${contacts.maxPhoneDisplay}`);
      });
    }
  });

  document.querySelectorAll(".faq-button").forEach((button) => {
    button.addEventListener("click", () => {
      const expanded = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!expanded));
      const answer = document.getElementById(button.getAttribute("aria-controls"));
      answer?.setAttribute("aria-hidden", String(expanded));
      if (!expanded) trackEvent("faq_open", { placement: button.textContent.trim() });
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (modal && !modal.hidden) closeModal();
      else closeMenu();
      return;
    }

    if (event.key !== "Tab" || !modal || modal.hidden || !modalPanel) return;
    const focusable = [...modalPanel.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter((element) => !element.hidden && element.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  function setupFixedCta() {
    if (!fixedCta || !("IntersectionObserver" in window)) return;
    const hero = document.querySelector(".hero");
    const contact = document.getElementById("contact");
    const footer = document.querySelector(".site-footer");
    if (!hero || !contact || !footer) return;

    const visibility = { hero: true, contact: false, footer: false };
    const update = () => fixedCta.classList.toggle("is-visible", !visibility.hero && !visibility.contact && !visibility.footer);
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.target === hero) visibility.hero = entry.isIntersecting;
        if (entry.target === contact) visibility.contact = entry.isIntersecting;
        if (entry.target === footer) visibility.footer = entry.isIntersecting;
      });
      update();
    }, { threshold: 0.08 });

    observer.observe(hero);
    observer.observe(contact);
    observer.observe(footer);
  }

  updateChannelLinks();
  setupFixedCta();
})();
