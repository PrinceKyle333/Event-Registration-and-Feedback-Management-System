import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { EvaluationReport, EventItem } from '../types';
import crestImage from '../assets/images/cmu_academic_crest_1792726539957.jpg';

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
            Print Official Report
          </button>
        </div>
      </div>

      {loading && (
        <div className="p-12 text-center text-xs text-stone-500 bg-white rounded-xl border border-stone-200">
          Calculating statistical survey aggregates from MySQL database...
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
          {error}
        </div>
      )}

      {report && !loading && (
        <div className="bg-white p-6 sm:p-10 rounded-xl border border-stone-200 shadow-xs print:shadow-none print:border-none print:p-0 space-y-8">
          {/* Institutional Print Header */}
          <div className="border-b-2 border-[#00491E] pb-6 flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <img
                src={crestImage}
                alt="Central Mindanao University"
                className="w-16 h-16 object-contain"
                referrerPolicy="no-referrer"
              />
              <div>
                <span className="text-xs font-semibold tracking-wider uppercase text-stone-500 block">
                  Republic of the Philippines · Central Mindanao University
                </span>
                <h1 className="text-xl sm:text-2xl font-bold font-serif-cmu text-[#00491E] leading-tight">
                  Office of Student Affairs & Academic Services
                </h1>
                <p className="text-xs text-stone-600 font-sans-cmu">
                  Official Post-Event Evaluation & Feedback Summary Report
                </p>
              </div>
            </div>

            <div className="text-right text-xs text-stone-500 hidden sm:block">
              <div>System: BSIT 4B SIA Project</div>
              <div>Generated: {new Date(report.generated_at).toLocaleDateString()}</div>
              <div className="font-mono text-[11px] text-stone-400">REST API v1.0</div>
            </div>
          </div>

          {/* Event Profile Card */}
          <div className="bg-stone-50 p-5 rounded-lg border border-stone-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-xs text-stone-500 font-medium">Event Title</span>
                <h2 className="text-lg font-bold font-serif-cmu text-stone-900">
                  {report.event_name}
                </h2>
              </div>
              <span className={`px-3 py-1 rounded-md text-xs font-bold border ${getInterpretationColor(report.overall_interpretation)}`}>
                {report.overall_interpretation} ({report.overall_mean_score.toFixed(2)} / 5.00)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-3 border-t border-stone-200 text-stone-700">
              <div>
                <span className="text-stone-500 block">Department</span>
                <span className="font-semibold">{report.department}</span>
              </div>
              <div>
                <span className="text-stone-500 block">Event Date & Venue</span>
                <span className="font-semibold">{report.event_date} · {report.venue}</span>
              </div>
              <div>
                <span className="text-stone-500 block">Attendance Rate</span>
                <span className="font-mono tabular-nums font-semibold">
                  {report.total_attended} / {report.total_registered} ({report.total_registered > 0 ? ((report.total_attended / report.total_registered) * 100).toFixed(0) : 0}%)
                </span>
              </div>
              <div>
                <span className="text-stone-500 block">Evaluations Submitted</span>
                <span className="font-mono tabular-nums font-semibold">
                  {report.total_evaluations} submissions ({report.response_rate_percent}%)
                </span>
              </div>
            </div>
          </div>

          {/* Rating Scale Reference Rubric */}
          <div className="p-3.5 bg-stone-50/70 border border-stone-200 rounded-lg text-xs">
            <span className="font-semibold text-stone-800 block mb-1">
              Official Interpretation Scale Matrix:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-stone-600 text-[11px]">
              <div><strong className="text-emerald-700">4.50 – 5.00:</strong> Excellent</div>
              <div><strong className="text-green-700">4.00 – 4.49:</strong> Very Satisfactory</div>
              <div><strong className="text-amber-700">3.00 – 3.99:</strong> Satisfactory</div>
              <div><strong className="text-orange-700">1.50 – 2.99:</strong> Unsatisfactory</div>
              <div><strong className="text-rose-700">1.00 – 1.49:</strong> Very Unsatisfactory</div>
            </div>
          </div>

          {/* Section by Section Breakdown */}
          <div className="space-y-6">
            <h3 className="text-base font-bold font-serif-cmu text-stone-900 border-b border-stone-200 pb-2">
              Evaluation Results by Survey Section & Question
            </h3>

            {report.sections.map((section, secIdx) => (
              <div key={section.section_id} className="border border-stone-200 rounded-lg overflow-hidden">
                <div className="bg-stone-100/70 px-4 py-3 flex items-center justify-between border-b border-stone-200">
                  <div>
                    <h4 className="text-xs font-bold text-[#00491E] tracking-tight uppercase">
                      Section {secIdx + 1}: {section.section_name}
                    </h4>
                    <span className="text-[11px] text-stone-500">
                      {section.section_description}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-xs text-stone-800 tabular-nums">
                      {section.mean_score > 0 ? section.mean_score.toFixed(2) : '—'} / 5.00
                    </span>
                    <span className="text-[11px] text-stone-500 block">
                      {section.interpretation}
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-stone-100">
                  {section.questions.map((q, qIdx) => (
                    <div key={q.question_id} className="p-4 hover:bg-stone-50/50 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <div className="text-xs font-medium text-stone-800 max-w-xl">
                          <span className="font-mono text-stone-400 mr-1.5">
                            {secIdx + 1}.{qIdx + 1}
                          </span>
                          {q.question_text}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-mono font-bold text-xs text-stone-900 tabular-nums">
                            {q.mean_score > 0 ? q.mean_score.toFixed(2) : '—'}
                          </span>
                          <span className="text-[11px] font-medium text-stone-600 bg-stone-100 px-2 py-0.5 rounded">
                            {q.interpretation}
                          </span>
                        </div>
                      </div>

                      {/* Visual Frequency Distribution Bar */}
                      <div className="grid grid-cols-5 gap-1.5 pt-1">
                        {[1, 2, 3, 4, 5].map((ratingVal) => {
                          const count = q.rating_counts[ratingVal] || 0;
                          const totalQ = q.responses_count || 1;
                          const pct = q.responses_count > 0 ? (count / totalQ) * 100 : 0;
                          return (
                            <div key={ratingVal} className="space-y-0.5">
                              <div className="flex justify-between text-[10px] text-stone-400 font-mono">
                                <span>R{ratingVal}</span>
                                <span>{count}</span>
                              </div>
                              <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    ratingVal >= 4 ? 'bg-[#00491E]' : ratingVal === 3 ? 'bg-amber-400' : 'bg-rose-400'
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Anonymous Written Comments */}
          <div className="border border-stone-200 rounded-lg p-5 bg-stone-50/50 space-y-3">
            <div className="flex items-center justify-between border-b border-stone-200 pb-2">
              <h4 className="text-xs font-bold text-[#00491E] tracking-tight uppercase">
                Anonymous Participant Comments & Suggestions
              </h4>
              <span className="text-[11px] text-stone-500 font-mono">
                {report.anonymous_comments.length} comments recorded
              </span>
            </div>

            {report.anonymous_comments.length === 0 ? (
              <p className="text-xs text-stone-500 italic py-2">
                No written comments submitted for this event yet.
              </p>
            ) : (
              <div className="space-y-2.5">
                {report.anonymous_comments.map((comm, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white rounded border border-stone-200 text-xs text-stone-700 leading-relaxed"
                  >
                    <p>"{comm.comment}"</p>
                    <div className="text-[10px] text-stone-400 mt-1 font-mono">
                      Feedback Entry · {new Date(comm.submit_date).toLocaleDateString()} (Identity Anonymized)
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Academic Memo Sign-off block for printed reports */}
          <div className="pt-8 border-t border-stone-200 grid grid-cols-2 sm:grid-cols-3 gap-6 text-xs text-stone-700">
            <div>
              <span className="text-stone-400 block mb-8">Prepared by:</span>
              <div className="font-semibold text-stone-900 border-t border-stone-400 pt-1">
                Student Council Secretariat
              </div>
              <div className="text-[11px] text-stone-500">BSIT 4B Event Coordinators</div>
            </div>

            <div>
              <span className="text-stone-400 block mb-8">Reviewed by:</span>
              <div className="font-semibold text-stone-900 border-t border-stone-400 pt-1">
                Prof. Maria Santos
              </div>
              <div className="text-[11px] text-stone-500">Event Organizer / Faculty Adviser</div>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <span className="text-stone-400 block mb-8">Certified by:</span>
              <div className="font-semibold text-stone-900 border-t border-stone-400 pt-1">
                Engr. Juan Dela Cruz
              </div>
              <div className="text-[11px] text-stone-500">Dean, CISC / System Administrator</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
