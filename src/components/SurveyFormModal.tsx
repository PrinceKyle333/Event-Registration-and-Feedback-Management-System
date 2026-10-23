import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { SurveySection, EventItem } from '../types';

interface SurveyFormModalProps {
  event: EventItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}

export const SurveyFormModal: React.FC<SurveyFormModalProps> = ({
  event,
  isOpen,
  onClose,
  onSubmitted,
}) => {
  const [sections, setSections] = useState<SurveySection[]>([]);
  const [ratings, setRatings] = useState<Record<number, number>>({});
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSections();
      setRatings({});
      setComments('');
      setError(null);
      setIsSuccess(false);
    }
  }, [isOpen, event]);

  const loadSections = async () => {
    setLoading(true);
    try {
      const data = await api.getSurveySections();
      setSections(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load survey questions');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !event) return null;

  const handleRatingChange = (questionId: number, ratingVal: number) => {
    setRatings((prev) => ({
      ...prev,
      [questionId]: ratingVal,
    }));
  };

  const allQuestions = sections.flatMap((s) => s.questions);
  const totalQuestions = allQuestions.length;
  const answeredCount = Object.keys(ratings).length;
  const isFormComplete = answeredCount === totalQuestions && totalQuestions > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormComplete) {
      setError(`Please provide a rating for all ${totalQuestions} survey questions before submitting.`);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const responseArray = Object.entries(ratings).map(([qId, rat]) => ({
        question_id: Number(qId),
        rating: rat,
      }));

      await api.submitEvaluation(event.event_id, {
        comments,
        responses: responseArray,
      });

      setIsSuccess(true);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
      setTimeout(() => {
        onSubmitted();
        onClose();
      }, 1800);
    } catch (err: any) {
      setError(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const ratingLabels: Record<number, string> = {
    1: '1 - Very Poor',
    2: '2 - Poor',
    3: '3 - Fair',
    4: '4 - Good',
    5: '5 - Excellent',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full overflow-hidden border border-stone-200 my-6 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#00491E] text-white px-6 py-4 shrink-0 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-amber-300 tracking-wider uppercase font-sans-cmu">
              Central Mindanao University · Event Evaluation Form
            </div>
            <h2 className="text-lg sm:text-xl font-bold font-serif-cmu text-white mt-0.5">
              {event.event_name}
            </h2>
            <p className="text-xs text-stone-200">
              Evaluations are strictly anonymous in summary reports. Only verified attendees can evaluate.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-300 hover:text-white text-lg p-1"
          >
            ✕
          </button>
        </div>

        {/* Progress Tracker */}
        <div className="bg-stone-50 border-b border-stone-200 px-6 py-2.5 flex items-center justify-between text-xs shrink-0">
          <span className="text-stone-600 font-medium">
            Survey Progress: <strong className="font-mono text-[#00491E]">{answeredCount}</strong> of <strong className="font-mono text-[#00491E]">{totalQuestions}</strong> questions rated
          </span>
          <div className="w-36 bg-stone-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-[#00491E] h-full transition-all duration-300"
              style={{ width: `${totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-8">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
              {error}
            </div>
          )}

          {isSuccess ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
                ✓
              </div>
              <h3 className="text-lg font-bold font-serif-cmu text-stone-900">
                Evaluation Submitted Successfully!
              </h3>
              <p className="text-xs text-stone-600 max-w-md mx-auto">
                Thank you for contributing your feedback. Your anonymous responses help Central Mindanao University continually enhance event quality and academic standards.
              </p>
            </div>
          ) : loading ? (
            <div className="py-12 text-center text-xs text-stone-500">
              Loading dynamic evaluation questionnaire...
            </div>
          ) : (
            <form id="eval-survey-form" onSubmit={handleSubmit} className="space-y-8">
              {/* Scale Legend */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-lg text-xs">
                <span className="font-semibold text-stone-800 block mb-1">
                  Rating Scale Reference:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-stone-600">
                  <span><strong>1</strong> – Very Poor</span>
                  <span><strong>2</strong> – Poor</span>
                  <span><strong>3</strong> – Fair</span>
                  <span><strong>4</strong> – Good</span>
                  <span><strong>5</strong> – Excellent</span>
                </div>
              </div>

              {/* Sections & Questions */}
              {sections.map((section, sIdx) => (
                <div key={section.section_id} className="space-y-4">
                  <div className="border-b border-stone-200 pb-2">
                    <h3 className="text-sm font-bold text-[#00491E] font-serif-cmu">
                      Section {sIdx + 1}: {section.section_name}
                    </h3>
                    {section.section_description && (
                      <p className="text-xs text-stone-500 mt-0.5">
                        {section.section_description}
                      </p>
                    )}
                  </div>

                  <div className="space-y-4">
                    {section.questions.map((q, qIdx) => {
                      const currentRating = ratings[q.question_id];
                      return (
                        <div
                          key={q.question_id}
                          className="p-3.5 rounded-lg border border-stone-200 bg-white hover:border-stone-300 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3 mb-2.5">
                            <span className="text-xs font-medium text-stone-800 leading-snug">
                              <span className="font-mono text-stone-400 mr-1.5">
                                {sIdx + 1}.{qIdx + 1}
                              </span>
                              {q.question_text}
                            </span>
                            {currentRating && (
                              <span className="text-[11px] font-semibold text-[#00491E] whitespace-nowrap shrink-0">
                                {ratingLabels[currentRating]}
                              </span>
                            )}
                          </div>

                          {/* 1 to 5 Buttons */}
                          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                            {[1, 2, 3, 4, 5].map((val) => {
                              const isSelected = currentRating === val;
                              return (
                                <button
                                  type="button"
                                  key={val}
                                  onClick={() => handleRatingChange(q.question_id, val)}
                                  className={`py-2 px-1 text-xs font-semibold rounded-md border transition-all text-center ${
                                    isSelected
                                      ? 'bg-[#00491E] text-white border-[#00491E] shadow-xs'
                                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100 hover:border-stone-300'
                                  }`}
                                >
                                  {val}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Optional Comments */}
              <div className="space-y-2 pt-2 border-t border-stone-200">
                <label className="block text-xs font-bold text-stone-800 font-serif-cmu">
                  Qualitative Feedback & Suggestions (Optional)
                </label>
                <p className="text-xs text-stone-500">
                  Please share any specific observations, highlights, or recommendations for future university events.
                </p>
                <textarea
                  rows={3}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Share your experience, speaker remarks, or venue suggestions..."
                  className="w-full p-3 text-xs border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00491E] focus:border-transparent leading-relaxed"
                />
              </div>
            </form>
          )}
        </div>

        {/* Footer Actions */}
        {!isSuccess && (
          <div className="bg-stone-50 border-t border-stone-200 px-6 py-4 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900"
            >
              Cancel
            </button>

            <button
              type="submit"
              form="eval-survey-form"
              disabled={submitting || !isFormComplete}
              className="px-6 py-2 text-xs font-semibold text-stone-900 bg-[#FFC600] hover:bg-amber-400 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
            >
              {submitting ? 'Submitting Evaluation...' : 'Submit Evaluation'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
