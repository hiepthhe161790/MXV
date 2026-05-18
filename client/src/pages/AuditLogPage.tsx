import { useEffect, useState, useCallback } from 'react';
import { ScrollText, Filter, RefreshCw, AlertTriangle, CheckCircle, Info, XCircle, Download } from 'lucide-react';
import { useAuthStore } from '@/context/store';
import api from '@/services/api';

interface AuditLog {
  _id: string;
  eventId: string;
  accountId?: string;
  eventType: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  message: string;
  data?: any;
  createdAt: string;
}

const SEVERITY_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  INFO:     { icon: Info,          color: 'text-blue-400',   bg: 'bg-blue-600/10 border-blue-600/20' },
  WARNING:  { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-600/10 border-yellow-600/20' },
  ERROR:    { icon: XCircle,       color: 'text-red-400',    bg: 'bg-red-600/10 border-red-600/20' },
  CRITICAL: { icon: AlertTriangle, color: 'text-red-500',    bg: 'bg-red-700/20 border-red-700/30' },
};

const EVENT_TYPES = [
  'ALL',
  'ACCOUNT_CREATED', 'LOGIN', 'DEPOSIT', 'WITHDRAWAL',
  'ORDER_PLACED', 'ORDER_FILLED', 'ORDER_CANCELLED',
  'MARGIN_CALL', 'LIQUIDATION', 'EOD_SETTLEMENT',
];

export default function AuditLogPage() {
  const { account } = useAuthStore();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [eventFilter, setEventFilter] = useState('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const loadLogs = useCallback(async () => {
    try {
      const params: Record<string, string> = { limit: '200' };
      if (!showAll && account?._id) params.accountId = account._id;
      if (eventFilter !== 'ALL') params.eventType = eventFilter;
      const res = await api.get('/audit-logs', { params });
      setLogs(res.data || []);
    } catch (err) {
      console.error('Audit log error:', err);
    } finally {
      setLoading(false);
    }
  }, [account?._id, showAll, eventFilter]);

  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 10000);
    return () => clearInterval(interval);
  }, [loadLogs]);

  const filtered = logs.filter(log => {
    if (severityFilter !== 'ALL' && log.severity !== severityFilter) return false;
    return true;
  });

  const exportLogs = () => {
    const csv = [
      ['EventID', 'EventType', 'Severity', 'Message', 'AccountID', 'Timestamp'].join(','),
      ...filtered.map(l => [
        l.eventId, l.eventType, l.severity,
        `"${l.message}"`, l.accountId || '-',
        new Date(l.createdAt).toISOString(),
      ].join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `audit_log_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center space-x-3">
            <ScrollText className="text-purple-400" size={32} />
            <span>Audit Log</span>
          </h1>
          <p className="text-slate-400 mt-1">
            Lịch sử toàn bộ sự kiện hệ thống — immutable, dùng để debug và compliance
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={loadLogs} className="btn btn-secondary flex items-center space-x-2">
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
          <button onClick={exportLogs} className="btn btn-secondary flex items-center space-x-2">
            <Download size={15} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(['INFO', 'WARNING', 'ERROR', 'CRITICAL'] as const).map(sev => {
          const cfg = SEVERITY_CONFIG[sev];
          const count = logs.filter(l => l.severity === sev).length;
          return (
            <button
              key={sev}
              onClick={() => setSeverityFilter(severityFilter === sev ? 'ALL' : sev)}
              className={`card p-3 text-left transition-all hover:scale-105 ${
                severityFilter === sev ? `border-2 ${cfg.color.replace('text', 'border')}` : ''
              }`}
            >
              <div className={`flex items-center space-x-2 ${cfg.color}`}>
                <cfg.icon size={16} />
                <span className="text-xs font-semibold">{sev}</span>
              </div>
              <p className="text-2xl font-bold text-white mt-1">{count}</p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter size={16} className="text-slate-400" />
        <div className="flex flex-wrap gap-1">
          {EVENT_TYPES.slice(0, 8).map(et => (
            <button
              key={et}
              onClick={() => setEventFilter(et)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                eventFilter === et
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              {et === 'ALL' ? 'Tất cả' : et}
            </button>
          ))}
        </div>
        <label className="flex items-center space-x-2 ml-auto text-xs text-slate-400 cursor-pointer">
          <input
            type="checkbox"
            checked={showAll}
            onChange={e => setShowAll(e.target.checked)}
            className="rounded"
          />
          <span>Xem tất cả tài khoản</span>
        </label>
        <span className="text-xs text-slate-500">{filtered.length} sự kiện</span>
      </div>

      {/* Log List */}
      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[...Array(5)].map((_, i) => <div key={i} className="card h-16 bg-slate-700" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <ScrollText size={48} className="mx-auto text-slate-600 mb-4" />
          <p className="text-slate-400">Chưa có sự kiện nào được ghi nhận</p>
          <p className="text-slate-500 text-sm mt-2">Hãy thực hiện các thao tác như đặt lệnh, nộp tiền để tạo sự kiện</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(log => {
            const cfg = SEVERITY_CONFIG[log.severity] || SEVERITY_CONFIG.INFO;
            const isExpanded = expandedId === log._id;
            return (
              <div
                key={log._id}
                className={`rounded-lg border p-3 cursor-pointer transition-all hover:bg-slate-700/50 ${cfg.bg}`}
                onClick={() => setExpandedId(isExpanded ? null : log._id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center space-x-3 min-w-0">
                    <cfg.icon size={16} className={`flex-shrink-0 ${cfg.color}`} />
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${cfg.color} bg-slate-800`}>
                          {log.eventType}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.color}`}>
                          {log.severity}
                        </span>
                      </div>
                      <p className="text-sm text-white mt-1 truncate">{log.message}</p>
                      {log.accountId && (
                        <p className="text-xs text-slate-500 font-mono mt-0.5">
                          acct: {log.accountId.slice(0, 16)}…
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-slate-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('vi-VN')}
                    </p>
                    <p className="text-xs text-slate-600 font-mono mt-0.5">{log.eventId?.slice(0, 8)}…</p>
                  </div>
                </div>

                {isExpanded && log.data && Object.keys(log.data).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-600">
                    <p className="text-xs text-slate-400 mb-2 font-semibold">Event Data:</p>
                    <pre className="text-xs font-mono text-slate-300 bg-slate-900 rounded p-3 overflow-x-auto">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
