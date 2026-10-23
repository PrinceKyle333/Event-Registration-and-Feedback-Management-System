import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { EvaluationReport, EventItem } from '../types';

interface EvaluationReportViewProps {
  initialEventId?: number;
  events: EventItem[];
}

export const EvaluationReportView: React.FC<EvaluationReportViewProps> = ({
  initialEventId,
  events,
}) => {
  const [selectedEventId, setSelectedEventId] = useState<number>(
    initialEventId || (events.length > 0 ? events[0].event_id : 1)
  );
  const [report, setReport] = useState<EvaluationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedEventId) {
      loadReport(selectedEventId);
    }
  }, [selectedEventId]);

  const loadReport = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getEvaluationReport(id);
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Failed to generate evaluation report');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!report) return;

    const rows: string[][] = [
      ['Central Mindanao University - Event Evaluation Report'],
      [`Event: ${report.event_name}`],
      [`Date: ${report.event_date}`],
      [`Department: ${report.department}`],
      [`Venue: ${report.venue}`],
      [`Total Registered: ${report.total_registered}`, `Total Attended: ${report.total_attended}`, `Evaluations: ${report.total_evaluations}`],
      [`Overall Mean Score: ${report.overall_mean_score}`, `Interpretation: ${report.overall_interpretation}`],
      [''],
      ['Section', 'Question ID', 'Survey Question Text', 'Mean Rating (1-5)', 'Responses Count', 'Interpretation', 'Rate 1', 'Rate 2', 'Rate 3', 'Rate 4', 'Rate 5'],
    ];

    report.sections.forEach((sec) => {
      sec.questions.forEach((q) => {
        rows.push([
          `"${sec.section_name.replace(/"/g, '""')}"`,
          q.question_id.toString(),
          `"${q.question_text.replace(/"/g, '""')}"`,
          q.mean_score.toFixed(2),
          q.responses_count.toString(),
          `"${q.interpretation}"`,
          (q.rating_counts[1] || 0).toString(),
          (q.rating_counts[2] || 0).toString(),
          (q.rating_counts[3] || 0).toString(),
          (q.rating_counts[4] || 0).toString(),
          (q.rating_counts[5] || 0).toString(),
        ]);
      });
    });

    if (report.anonymous_comments.length > 0) {
      rows.push(['']);
      rows.push(['Anonymous Participant Comments']);
      report.anonymous_comments.forEach((c) => {
        rows.push([`"${c.submit_date}"`, `"${c.comment.replace(/"/g, '""')}"`]);
      });
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CMU_Evaluation_Report_Event_${report.event_id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getInterpretationColor = (label: string) => {
    switch (label) {
      case 'Excellent':
        return 'text-emerald-800 bg-emerald-100 border-emerald-300';
      case 'Very Satisfactory':
        return 'text-green-800 bg-green-100 border-green-300';
      case 'Satisfactory':
        return 'text-amber-800 bg-amber-100 border-amber-300';
      case 'Unsatisfactory':
        return 'text-orange-800 bg-orange-100 border-orange-300';
      default:
        return 'text-rose-800 bg-rose-100 border-rose-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Control bar (hidden during print) */}
      <div className="no-print bg-white p-4 rounded-xl border border-stone-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-stone-700 whitespace-nowrap">
            Select Event Report:
          </label>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(Number(e.target.value))}
            className="text-xs border border-stone-300 rounded-md px-3 py-1.5 bg-stone-50 font-medium text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#00491E] max-w-sm"
          >
            {events.map((evt) => (
              <option key={evt.event_id} value={evt.event_id}>
                {evt.event_name} ({evt.event_date})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={!report}
            className="px-3.5 py-1.5 text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-md transition-colors border border-stone-300 disabled:opacity-50"
          >
            Export CSV
          </button>
          <button
            onClick={handlePrint}
            disabled={!report}
            className="px-4 py-1.5 text-xs font-semibold bg-[#00491E] hover:bg-[#02681E] text-white rounded-md transition-colors shadow-xs disabled:opacity-50"
          >
            Print Report
          </button>
        </div>
      </div>

      {loading && (
        <div className="p-12 text-center text-xs text-stone-500 bg-white rounded-xl border border-stone-200">
          Loading report...
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
          {error}
        </div>
      )}

      {report && !loading && (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden print:border-none">
          {/* Green report header with event title */}
          <div
            className="bg-[#00491E] text-white px-6 sm:px-8 py-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4"
            style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
          >
            <div className="min-w-0">
              <span className="text-[10px] font-bold tracking-widest uppercase text-[#FFC600]">
                Evaluation Report
              </span>
              <h1 className="text-xl sm:text-2xl font-bold font-serif-cmu leading-tight mt-1">
                {report.event_name}
              </h1>
              <p className="text-xs text-white/70 mt-1.5">
                {report.department} · {report.event_date} · {report.venue}
              </p>
            </div>
            <div className="sm:text-right shrink-0">
              <div className="text-3xl font-black tabular-nums text-[#FFC600] leading-none">
                {report.overall_mean_score.toFixed(2)}
                <span className="text-sm font-bold text-white/60"> / 5</span>
              </div>
              <div className="text-xs font-semibold text-white/85 mt-1">{report.overall_interpretation}</div>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-8">
            {/* Key figures */}
            <div className="grid grid-cols-3 divide-x divide-stone-200 text-center">
              <div className="px-2">
                <div className="text-xl font-bold tabular-nums text-stone-900">
                  {report.total_attended}
                  <span className="text-sm text-stone-400"> / {report.total_registered}</span>
                </div>
                <div className="text-[11px] text-stone-500 mt-0.5">Attended</div>
              </div>
              <div className="px-2">
                <div className="text-xl font-bold tabular-nums text-stone-900">{report.total_evaluations}</div>
                <div className="text-[11px] text-stone-500 mt-0.5">Evaluations</div>
              </div>
              <div className="px-2">
                <div className="text-xl font-bold tabular-nums text-stone-900">{report.response_rate_percent}%</div>
                <div className="text-[11px] text-stone-500 mt-0.5">Response Rate</div>
              </div>
            </div>

            {/* Results by section */}
            {report.sections.map((section) => (
              <div key={section.section_id}>
                <div className="flex items-baseline justify-between gap-4 border-b border-stone-200 pb-2 mb-1">
                  <h3 className="text-sm font-bold text-[#00491E]">{section.section_name}</h3>
                  <span className="text-sm font-bold tabular-nums text-stone-900 shrink-0">
                    {section.mean_score > 0 ? section.mean_score.toFixed(2) : '—'}
                    <span className="text-xs font-medium text-stone-400 ml-1.5">{section.interpretation}</span>
                  </span>
                </div>

                <div className="divide-y divide-stone-100">
                  {section.questions.map((q) => (
                    <div key={q.question_id} className="py-2.5 flex items-center gap-4">
                      <span className="flex-1 text-xs text-stone-700">{q.question_text}</span>
                      <div className="w-24 sm:w-32 h-1.5 bg-stone-100 rounded-full overflow-hidden shrink-0">
                        <div
                          className="h-full bg-[#00491E] rounded-full"
                          style={{ width: `${(q.mean_score / 5) * 100}%`, printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
                        />
                      </div>
                      <span className="w-9 text-right text-xs font-semibold tabular-nums text-stone-900 shrink-0">
                        {q.mean_score > 0 ? q.mean_score.toFixed(2) : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Anonymous comments */}
            <div>
              <div className="flex items-baseline justify-between gap-4 border-b border-stone-200 pb-2 mb-3">
                <h3 className="text-sm font-bold text-[#00491E]">Comments</h3>
                <span className="text-xs text-stone-400">{report.anonymous_comments.length} anonymous</span>
              </div>
              {report.anonymous_comments.length === 0 ? (
                <p className="text-xs text-stone-400">No written comments yet.</p>
              ) : (
                <div className="space-y-3">
                  {report.anonymous_comments.map((comm, idx) => (
                    <blockquote key={idx} className="border-l-2 border-[#00491E]/30 pl-3 text-xs text-stone-700 leading-relaxed">
                      {comm.comment}
                      <div className="text-[10px] text-stone-400 mt-0.5">
                        {new Date(comm.submit_date).toLocaleDateString()}
                      </div>
                    </blockquote>
                  ))}
                </div>
              )}
            </div>

            {/* Rating scale */}
            <p className="text-[10px] text-stone-400 border-t border-stone-100 pt-4">
              Scale: 4.50–5.00 Excellent · 4.00–4.49 Very Satisfactory · 3.00–3.99 Satisfactory · 1.50–2.99
              Unsatisfactory · 1.00–1.49 Very Unsatisfactory · Generated {new Date(report.generated_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
