import React from 'react';
import StatusBadge from './StatusBadge';

interface Column {
  header: string;
  accessor: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
}

export default function DataTable({ columns, data }: DataTableProps) {
  return (
    <div className="w-full overflow-x-auto bg-white rounded-2xl border border-light-color/50 shadow-sm">
      <table className="w-full text-left border-collapse">
        <thead className="bg-light-color/20 border-b border-light-color/50">
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} className="px-6 py-4 text-xs font-bold text-dark-blue uppercase tracking-wider">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-light-color/30">
          {data.map((row, rowIdx) => (
            <tr key={rowIdx} className="hover:bg-light-color/10 transition-colors">
              {columns.map((col, colIdx) => (
                <td key={colIdx} className="px-6 py-4 text-sm text-body-text">
                  {col.render ? col.render(row[col.accessor], row) : (
                    col.accessor === 'status' ? <StatusBadge status={row[col.accessor]} /> : row[col.accessor]
                  )}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-6 py-10 text-center text-body-text opacity-50">
                No records found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
