"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, Shield } from "lucide-react";
import { toast } from "sonner";
import Modal from "@/src/components/ui/modal";
import { Button } from "@/src/components/ui/button";
import { useProfileDisplay } from "../hooks/use-profile-display";
import {
  getSecuritySettings,
  saveSecuritySettings,
} from "@/src/shared/lib/security-settings-store";

export default function AccountSecurityLayout() {
  const { email, phone, user, updateProfile } = useProfileDisplay();
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [method, setMethod] = useState("");
  const [modalAction, setModalAction] = useState<"on" | "off" | null>(null);

  const verifyOptions = useMemo(() => {
    const options = [email, phone].filter((value) => value && value !== "—");
    return options.length > 0 ? options : ["Add email in profile to enable 2FA"];
  }, [email, phone]);

  useEffect(() => {
    const settings = getSecuritySettings(email);
    const db2fa = (user as any)?.twoFactorEnabled;
    const is2faOn = db2fa !== undefined ? Boolean(db2fa) : settings.twoFactorEnabled;
    setEnabled(is2faOn);
    setMethod(settings.twoFactorMethod || verifyOptions[0] || "");
    if (email && db2fa !== undefined) {
      saveSecuritySettings({ twoFactorEnabled: is2faOn, twoFactorMethod: settings.twoFactorMethod || verifyOptions[0] || "" }, email);
    }
  }, [email, verifyOptions, user]);

  const persist = async (nextEnabled: boolean) => {
    setSaving(true);
    saveSecuritySettings({
      twoFactorEnabled: nextEnabled,
      twoFactorMethod: method,
    }, email);
    try {
      await updateProfile({
        twoFactorEnabled: nextEnabled,
        twoFactorMethod: method,
      } as any);
    } catch {}
    setEnabled(nextEnabled);
    setSaving(false);
    setModalAction(null);
    toast.success(
      nextEnabled ? "Two-factor authentication enabled" : "Two-factor authentication disabled"
    );
  };

  return (
    <div className="flex justify-center px-2 py-4">
      <div className="w-full rounded-2xl bg-card p-6 shadow-sm sm:p-7 text-center" style={{ maxWidth: "480px" }}>
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center">
          <Shield className="h-14 w-14 stroke-[1.5] text-foreground" strokeWidth={1.25} />
        </div>

        <h3 className="text-lg font-bold text-foreground">Two-Factor Authentication</h3>
        <p className="mx-auto mt-2 mb-6 max-w-xs text-xs text-muted-foreground">
          Choose where to receive one-time codes when signing in.
        </p>

        <div className="relative mb-8 text-left">
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            disabled={verifyOptions[0]?.startsWith("Add email")}
            className="h-11 w-full appearance-none rounded-lg border border-input bg-background px-4 pr-10 text-sm font-medium text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50"
          >
            {verifyOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-border pt-5">
            <span className="text-sm font-medium text-gray-600">
              {enabled ? "2FA is on" : "2FA is off"}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setModalAction("off")}
                className={`min-w-[3rem] rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  !enabled ? "bg-[#eef1f5] text-gray-700" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                OFF
              </button>
              <button
                type="button"
                onClick={() => setModalAction("on")}
                className={`min-w-[3rem] rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  enabled
                    ? "bg-primary text-white shadow-sm"
                    : "bg-[#eef1f5] text-gray-600 hover:bg-[#e4e8ee]"
                }`}
              >
                ON
              </button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={modalAction !== null}
        onClose={() => setModalAction(null)}
        title={
          modalAction === "off" ? "Turn off 2-step verification" : "Enable 2-step verification"
        }
        size="sm"
      >
        <div className="mb-4 text-sm text-slate-700">
          {modalAction === "off"
            ? "Turning off 2-step verification removes an extra layer of protection on your account."
            : `Codes will be sent to ${method || "your selected contact"}.`}
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setModalAction(null)}>
            Cancel
          </Button>
          <Button
            className={modalAction === "off" ? "bg-rose-600 text-white" : undefined}
            onClick={() => persist(modalAction === "on")}
            disabled={saving || verifyOptions[0]?.startsWith("Add email")}
          >
            {saving ? "Saving…" : modalAction === "off" ? "Turn off" : "Enable"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
