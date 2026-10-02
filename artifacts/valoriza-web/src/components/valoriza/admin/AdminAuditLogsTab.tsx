import { useQuery } from "@tanstack/react-query";
import { Shield, RefreshCw, Clock, UserCheck } from "lucide-react";
import { getAdminAuditLogs } from "@/lib/valoriza-admin.functions";

export function AdminAuditLogsTab() {
  const {
    data: logs = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: () => getAdminAuditLogs(),
    refetchInterval: 20000,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
            <Shield className="h-4 w-4 text-cyan-glow" />
            <span>سجل تدقيق عمليات المشرفين (Audit Logs)</span>
          </h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            توثيق كامل لكافة التغييرات الإدارية والموافقات المالية وتعديل الأرصدة.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="flex items-center gap-1 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>تحديث</span>
        </button>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-xs text-muted-foreground">
          <RefreshCw className="mx-auto h-7 w-7 animate-spin text-cyan-glow mb-2" />
          جارٍ جلب سجلات التدقيق...
        </div>
      ) : logs.length === 0 ? (
        <div className="surface-card rounded-2xl p-8 text-center text-xs text-muted-foreground">
          لا توجد عمليات مسجلة في سجل التدقيق حتى الآن.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface/50">
          <table className="w-full text-right text-xs">
            <thead className="border-b border-border/80 bg-surface/80 text-[11px] font-bold text-muted-foreground">
              <tr>
                <th className="p-3">المشرف</th>
                <th className="p-3">الإجراء</th>
                <th className="p-3">الكيان المستهدف</th>
                <th className="p-3">التفاصيل</th>
                <th className="p-3">الوقت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {logs.map((log: any) => (
                <tr key={log.id} className="hover:bg-surface/80 transition-colors">
                  <td className="p-3">
                    <span className="font-bold text-foreground text-[11px]">
                      {log.admin_email || "System/Admin"}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="rounded-lg bg-cyan-glow/10 border border-cyan-glow/30 px-2 py-0.5 text-[10px] font-mono font-bold text-cyan-glow">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-[11px] text-muted-foreground">
                    {log.target_table} {log.target_id ? `(${log.target_id.slice(0, 8)}...)` : ""}
                  </td>
                  <td className="p-3">
                    <pre className="max-w-xs truncate text-[10px] text-muted-foreground font-mono bg-navy-deep p-1 rounded border border-border/60">
                      {JSON.stringify(log.details)}
                    </pre>
                  </td>
                  <td className="p-3 text-[10px] text-muted-foreground">
                    {new Date(log.created_at).toLocaleString("ar-SA", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
