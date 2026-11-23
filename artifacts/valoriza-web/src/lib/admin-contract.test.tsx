import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminUsersTab } from "../components/valoriza/admin/AdminUsersTab";
import { getAdminWheelPrizes, saveInvestmentFund, saveVipPackage, saveWheelPrize, reviewDeposit } from "./valoriza-admin.functions";
import { setStoredToken } from "./session-token";

test("admin requests preserve real authentication and normalize wheel form fields", async () => {
  const originalFetch = globalThis.fetch;
  Object.defineProperty(globalThis, "window", { configurable: true, value: {} });
  setStoredToken("disposable-server-token");
  try {
    globalThis.fetch = async (_url, init) => {
      assert.equal(new Headers(init?.headers).get("authorization"), "Bearer disposable-server-token");
      return Response.json([{ id: "prize", label_ar: "جائزة", prize_type: "cash", prize_value: "0.75", probability: "10", accent: "gold", is_active: false }]);
    };
    const prizes = await getAdminWheelPrizes();
    assert.equal(prizes[0].label, "جائزة");
    assert.equal(prizes[0].amount, 0.75);
    assert.equal(prizes[0].probability_weight, 10);
    assert.equal(prizes[0].prize_type, "cash");
    for (const [fn, path, body] of [
      [saveInvestmentFund, "/api/admin/funds/save", { id: "fund", nameAr: "صندوق", isActive: false }],
      [saveVipPackage, "/api/admin/vip-packages/save", { id: "package", price: 10, dailyTasks: 3 }],
      [saveWheelPrize, "/api/admin/wheel/save", { id: "prize", prizeValue: 0.75, probability: 0 }],
      [reviewDeposit, "/api/admin/deposits/review", { depositId: "deposit", action: "approve" }],
    ] as const) {
      globalThis.fetch = async (url, init) => {
        assert.equal(url, path); assert.equal(init?.method, "POST");
        assert.deepEqual(JSON.parse(String(init?.body)), body);
        return Response.json({ ok: true });
      };
      await (fn as any)(body);
      await (fn as any)({ data: body });
    }
  } finally {
    setStoredToken(null);
    delete (globalThis as any).window;
    globalThis.fetch = originalFetch;
  }
});

test("user management buttons have visible names, not just shrinking icons", () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  client.setQueryData(["admin-users"], [{
    id: "fixture", username: "test", email: "test@example.invalid",
    balance: 0, totalDeposited: 0, vipLevel: 0, wheelSpins: 0, isBlocked: false,
  }]);
  const html = renderToStaticMarkup(
    <QueryClientProvider client={client}><AdminUsersTab /></QueryClientProvider>,
  );
  for (const name of ["تغيير كلمة السر", "معاينة الحساب", "إضافة فرصة", "تعديل الرصيد", "تعديل العضوية", "حظر المستخدم"]) {
    assert.ok(html.includes(`<span>${name}</span>`), name);
  }
  client.clear();
});
