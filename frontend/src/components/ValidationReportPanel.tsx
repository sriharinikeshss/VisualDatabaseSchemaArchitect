import { useSchemaStore } from '../store/useSchemaStore';

export default function ValidationReportPanel() {
  const { validationReports, clearValidationReports } = useSchemaStore();

  if (validationReports.length === 0) return null;

  const errors = validationReports.filter(r => r.severity === 'Error');
  const warnings = validationReports.filter(r => r.severity === 'Warning');

  return (
    <div className="absolute bottom-4 left-4 w-96 max-h-96 bg-white border border-slate-200 shadow-2xl rounded-lg flex flex-col z-50 overflow-hidden">
      <div className="bg-slate-800 text-white px-4 py-3 flex justify-between items-center">
        <h3 className="font-bold flex items-center gap-2">
          Validation Report
          <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{errors.length}</span>
          <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">{warnings.length}</span>
        </h3>
        <button onClick={clearValidationReports} className="text-slate-300 hover:text-white font-bold">✕</button>
      </div>
      
      <div className="overflow-y-auto p-4 flex flex-col gap-3">
        {validationReports.map((report, idx) => (
          <div 
            key={idx} 
            className={`p-3 rounded border-l-4 ${report.severity === 'Error' ? 'bg-red-50 border-red-500 text-red-900' : 'bg-amber-50 border-amber-500 text-amber-900'}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-bold uppercase tracking-wider ${report.severity === 'Error' ? 'text-red-700' : 'text-amber-700'}`}>
                {report.severity}
              </span>
              <span className="text-sm font-semibold opacity-80">{report.rule_violated}</span>
            </div>
            <p className="text-sm leading-tight opacity-90">{report.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
