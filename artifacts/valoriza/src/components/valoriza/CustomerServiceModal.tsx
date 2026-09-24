import { useState } from "react";
import { Headphones, MessageCircle, Send, X } from "lucide-react";
import supportAgentImg from "@/assets/images/support_agent_1789808781142.jpg";

export type CustomerSupportLink = {
  id?: string;
  title: string;
  subtitle: string;
  platform: "telegram" | "whatsapp";
  url: string;
};

interface CustomerServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  customLinks?: CustomerSupportLink[];
}

export function CustomerServiceModal({ isOpen, onClose, customLinks }: CustomerServiceModalProps) {
  if (!isOpen) return null;

  const defaultLinks: CustomerSupportLink[] = [
    {
      title: "موظف الاستقبال",
      subtitle: "على تيليجرام",
      platform: "telegram",
      url: "https://t.me/valoriza_support",
    },
    {
      title: "موظف الاستقبال",
      subtitle: "على واتساب",
      platform: "whatsapp",
      url: "https://wa.me/34600000000",
    },
    {
      title: "المجموعة الرسمية",
      subtitle: "على تيليجرام",
      platform: "telegram",
      url: "https://t.me/valoriza_official_group",
    },
    {
      title: "المجموعة الرسمية",
      subtitle: "على واتساب",
      platform: "whatsapp",
      url: "https://chat.whatsapp.com/valoriza_vip",
    },
  ];

  const links = customLinks && customLinks.length > 0 ? customLinks : defaultLinks;

  return (
    <div
      id="customer-service-modal-overlay"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="customer-service-modal-content"
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-electric/40 bg-navy-deep p-5 shadow-2xl animate-in slide-in-from-bottom-6 duration-300"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface border border-primary/40 text-cyan-glow">
              <Headphones className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-foreground">خدمة العملاء</h2>
              <p className="text-[11px] text-muted-foreground">فريق الدعم الفني متواجد 24/7</p>
            </div>
          </div>
          <button
            id="close-customer-service-btn"
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-muted-foreground hover:text-foreground transition-colors"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Hero Support Banner matching Page 10 */}
        <div className="mt-4 surface-card glow-border overflow-hidden p-4 relative text-center">
          <div className="flex flex-col items-center">
            <div className="relative mb-2">
              <img
                src={supportAgentImg}
                alt="خدمة العملاء"
                className="h-20 w-20 rounded-full object-cover border-2 border-cyan-glow shadow-[0_0_16px_oklch(0.82_0.14_205/0.4)]"
              />
              <span className="absolute bottom-0 right-1 flex h-4 w-4">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                <span className="relative inline-flex h-4 w-4 rounded-full bg-success border-2 border-navy-deep" />
              </span>
            </div>
            <h3 className="text-xl font-extrabold text-gold-gradient">خدمة العملاء</h3>
            <p className="mt-1 text-xs font-semibold text-foreground/90">
              تواصل معنا وسنكون في خدمتك دائماً
            </p>
          </div>
        </div>

        {/* Support channels list matching Page 10 */}
        <div className="mt-4 space-y-2.5">
          {links.map((link, idx) => {
            const isTelegram = link.platform === "telegram";
            return (
              <a
                key={idx}
                id={`support-channel-${idx}`}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className={`group flex items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all duration-200 active:scale-[0.99] ${
                  isTelegram
                    ? "bg-gradient-to-l from-navy to-[#0a2745] border-cyan-glow/40 hover:border-cyan-glow hover:shadow-[0_0_16px_oklch(0.82_0.14_205/0.3)]"
                    : "bg-gradient-to-l from-navy to-[#0b3323] border-success/40 hover:border-success hover:shadow-[0_0_16px_oklch(0.7_0.17_152/0.3)]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${
                      isTelegram
                        ? "bg-[#0088cc]/20 border-[#0088cc]/50 text-cyan-glow"
                        : "bg-[#25D366]/20 border-[#25D366]/50 text-success"
                    }`}
                  >
                    {isTelegram ? (
                      <Send className="h-5 w-5 -scale-x-100" />
                    ) : (
                      <MessageCircle className="h-5 w-5" />
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                      {link.title}
                    </p>
                    <p className="text-[11px] font-semibold text-muted-foreground">
                      {link.subtitle}
                    </p>
                  </div>
                </div>

                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-transform group-hover:-translate-x-1 ${
                    isTelegram
                      ? "border-cyan-glow/40 text-cyan-glow bg-navy-deep/60"
                      : "border-success/40 text-success bg-navy-deep/60"
                  }`}
                >
                  ›
                </div>
              </a>
            );
          })}
        </div>

        {/* Footer note */}
        <p className="mt-4 text-center text-[10px] text-muted-foreground leading-relaxed">
          جميع قنوات التواصل مؤمنة ومشفرة بالكامل لخدمتكم على مدار 24 ساعة.
        </p>
      </div>
    </div>
  );
}
