import React, { useState } from 'react';
import { api } from '../services/api';

export const RestApiInspector: React.FC = () => {
  const [activeEndpoint, setActiveEndpoint] = useState<string>('GET /api/events');
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const endpoints = [
    { method: 'GET', path: '/api/events', desc: 'Retrieve approved public events with registration metrics' },
    { method: 'GET', path: '/api/survey/sections', desc: 'Retrieve dynamic 4 survey sections and 20 evaluation questions' },
    { method: 'GET', path: '/api/admin/dashboard', desc: 'System-wide counters (events, attendance rate, mean satisfaction)' },
    { method: 'GET', path: '/api/reports/events', desc: 'Comprehensive event report with attendance and average rating' },
    { method: 'GET', path: '/api/users', desc: 'Retrieve list of registered users in MySQL' },
    { method: 'GET', path: '/api/events/1/evaluation-report', desc: 'Calculated statistical report with section means and rubric interpretation' },
  ];

  const handleTestEndpoint = async (ep: { method: string; path: string }) => {
    setActiveEndpoint(`${ep.method} ${ep.path}`);
    setApiLoading(true);
    setApiResponse(null);

    try {
      const res = await fetch(ep.path);
      const data = await res.json();
      setApiResponse({
        status: res.status,
        statusText: res.statusText,
        headers: { 'content-type': res.headers.get('content-type') },
        data,
      });
    } catch (err: any) {
      setApiResponse({ error: err.message });
    } finally {
      setApiLoading(false);
    }
  };

  const handleResetDemo = async () => {
    if (!window.confirm('Reset database to original Central Mindanao University seed state?')) return;
    try {
      const res = await api.resetDemoDatabase();
      setResetMessage(res.message);
      setTimeout(() => setResetMessage(null), 3000);
      handleTestEndpoint(endpoints[0]);
    } catch (err: any) {
      alert('Failed to reset: ' + err.message);
    }
  };

  const handleDownloadSql = () => {
    window.location.href = '/api/system/export-sql';
  };

  return (
    <div className="space-y-8">
      {/* Overview header */}
      <div className="bg-white p-6 rounded-xl border border-stone-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4 mb-4">
          <div>
            <span className="text-xs font-semibold text-[#00491E] uppercase tracking-wider">
              BSIT 4B System Integration and Architecture (SIA)
            </span>
            <h2 className="text-xl font-bold font-serif-cmu text-stone-900 mt-0.5">
              REST API Integration & MySQL Architecture Hub
            </h2>
            <p className="text-xs text-stone-500 font-sans-cmu mt-1">
              Demonstrates end-to-end integration: Event Creation → Approval Workflow → Registration → Attendance Check-in → 4-Section Feedback Survey → Analytical Reporting.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadSql}
              className="px-3.5 py-2 text-xs font-semibold text-stone-900 bg-[#FFC600] hover:bg-amber-400 rounded-md transition-colors shadow-xs whitespace-nowrap"
            >
              ↓ Download event_evaluation_system.sql
            </button>
            <button
              onClick={handleResetDemo}
              className="px-3.5 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-md transition-colors border border-stone-200 whitespace-nowrap"
            >
              Reset Seed Data
            </button>
          </div>
        </div>

        {resetMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg mb-4">
            {resetMessage}
          </div>
        )}

        {/* Integration Architecture Flow Diagram */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
          <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
            <div className="font-bold text-[#00491E] mb-1">1. Event Proposing</div>
            <div className="text-stone-600">POST /api/events</div>
            <div className="text-[11px] text-stone-400 mt-1">Status: pending</div>
          </div>
          <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
            <div className="font-bold text-[#00491E] mb-1">2. Admin Approval</div>
            <div className="text-stone-600">PATCH /api/events/:id/approval</div>
            <div className="text-[11px] text-stone-400 mt-1">is_active: 1</div>
          </div>
          <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
            <div className="font-bold text-[#00491E] mb-1">3. Student Registration</div>
            <div className="text-stone-600">POST /api/events/:id/register</div>
            <div className="text-[11px] text-stone-400 mt-1">Unique student_id & capacity</div>
          </div>
          <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
            <div className="font-bold text-[#00491E] mb-1">4. Attendance Check-in</div>
            <div className="text-stone-600">PATCH /api/registrations/:id/attendance</div>
            <div className="text-[11px] text-stone-400 mt-1">Status: attended</div>
          </div>
          <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
            <div className="font-bold text-[#00491E] mb-1">5. Survey & Reports</div>
            <div className="text-stone-600">POST /api/events/:id/evaluations</div>
            <div className="text-[11px] text-stone-400 mt-1">GET evaluation-report</div>
          </div>
        </div>
      </div>

      {/* Live REST API Playground */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Endpoint Selector */}
        <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-stone-200 space-y-3">
          <h3 className="text-sm font-bold font-serif-cmu text-stone-900 border-b border-stone-100 pb-2">
            Available REST API Endpoints
          </h3>
          <div className="space-y-2">
            {endpoints.map((ep, idx) => {
              const isSelected = activeEndpoint === `${ep.method} ${ep.path}`;
              return (
                <div
                  key={idx}
                  onClick={() => handleTestEndpoint(ep)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[#00491E] bg-stone-50 shadow-xs'
                      : 'border-stone-200 hover:border-stone-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="whitespace-nowrap px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-[#00491E] text-white">
                      {ep.method}
                    </span>
                    <span className="font-mono text-xs font-semibold text-stone-800">
                      {ep.path}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 leading-snug">
                    {ep.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Response Viewer */}
        <div className="lg:col-span-7 bg-stone-900 text-stone-100 p-5 rounded-xl border border-stone-800 flex flex-col">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-3">
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-amber-400 font-semibold">{activeEndpoint}</span>
              {apiResponse?.status && (
                <span className="text-emerald-400 font-bold">
                  [{apiResponse.status} {apiResponse.statusText}]
                </span>
              )}
            </div>
            <button
              onClick={() => {
                const ep = endpoints.find(e => `${e.method} ${e.path}` === activeEndpoint) || endpoints[0];
                handleTestEndpoint(ep);
              }}
              disabled={apiLoading}
              className="px-2.5 py-1 text-xs bg-stone-800 hover:bg-stone-700 text-white rounded transition-colors font-mono"
            >
              {apiLoading ? 'Invoking...' : '▶ Send Request'}
            </button>
          </div>

          <div className="flex-1 overflow-auto max-h-[460px] font-mono text-xs bg-stone-950 p-4 rounded-lg border border-stone-800 text-stone-300">
            {apiLoading ? (
              <div className="text-stone-500 italic">Querying database...</div>
            ) : apiResponse ? (
              <pre className="whitespace-pre-wrap">{JSON.stringify(apiResponse.data, null, 2)}</pre>
            ) : (
              <div className="text-stone-500 italic">
                Select an endpoint on the left and click "Send Request" to test live JSON response.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MySQL Schema Specifications */}
      <div className="bg-white p-6 rounded-xl border border-stone-200 space-y-4">
        <h3 className="text-sm font-bold font-serif-cmu text-stone-900 border-b border-stone-100 pb-2">
          MySQL Relational Schema: `event_evaluation_system`
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
            <div className="font-bold text-[#00491E] font-mono mb-1">events</div>
            <div className="text-stone-600 font-mono text-[11px] space-y-0.5">
              <div>• event_id (PK)</div>
              <div>• event_name, event_date</div>
              <div>• department, venue</div>
              <div>• capacity, registration_deadline</div>
              <div>• approval_status, is_active</div>
              <div>• organizer_id (FK)</div>
            </div>
          </div>

          <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
            <div className="font-bold text-[#00491E] font-mono mb-1">registrations</div>
            <div className="text-stone-600 font-mono text-[11px] space-y-0.5">
              <div>• registration_id (PK)</div>
              <div>• event_id (FK)</div>
              <div>• user_id (FK)</div>
              <div>• attendance_status</div>
              <div>• attended_at</div>
              <div className="text-amber-800 font-semibold">• UNIQUE(event_id, user_id)</div>
            </div>
          </div>

          <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
            <div className="font-bold text-[#00491E] font-mono mb-1">survey_questions</div>
            <div className="text-stone-600 font-mono text-[11px] space-y-0.5">
              <div>• question_id (PK)</div>
              <div>• section_id (FK)</div>
              <div>• question_text</div>
              <div>• is_required</div>
              <div>• 4 Sections: Venue, Speaker, Food, Overall</div>
            </div>
          </div>

          <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
            <div className="font-bold text-[#00491E] font-mono mb-1">evaluations & responses</div>
            <div className="text-stone-600 font-mono text-[11px] space-y-0.5">
              <div>• evaluation_id (PK)</div>
              <div>• event_id (FK), submit_date</div>
              <div>• comments</div>
              <div>• responses: rating (1-5)</div>
              <div className="text-amber-800 font-semibold">• UNIQUE(eval_id, q_id)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
