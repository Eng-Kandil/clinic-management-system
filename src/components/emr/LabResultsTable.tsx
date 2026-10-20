"use client";

import { useState } from "react";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface LabResult {
  testName: string;
  result: string;
  unit?: string;
  normalRange?: string;
  date: string;
  isAbnormal?: boolean;
}

interface LabResultsTableProps {
  value: LabResult[];
  onChange: (results: LabResult[]) => void;
  readOnly?: boolean;
}

const emptyRow = (): LabResult => ({
  testName: "",
  result: "",
  unit: "",
  normalRange: "",
  date: new Date().toISOString().split("T")[0]!,
  isAbnormal: false,
});

export default function LabResultsTable({
  value,
  onChange,
  readOnly = false,
}: LabResultsTableProps) {
  const [rows, setRows] = useState<LabResult[]>(value.length > 0 ? value : []);

  const updateRows = (updated: LabResult[]) => {
    setRows(updated);
    onChange(updated);
  };

  const addRow = () => {
    updateRows([...rows, emptyRow()]);
  };

  const removeRow = (index: number) => {
    updateRows(rows.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: keyof LabResult, val: unknown) => {
    const updated = rows.map((row, i) =>
      i === index ? { ...row, [field]: val } : row
    );
    updateRows(updated);
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">Lab Results</h3>
        {!readOnly && (
          <Button variant="outline" size="sm" onClick={addRow} type="button">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Row
          </Button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center">
          <p className="text-sm text-slate-400">No lab results added</p>
          {!readOnly && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={addRow}
              type="button"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add first result
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50">
                <th className="px-3 py-2.5 font-medium text-slate-600">Test Name</th>
                <th className="px-3 py-2.5 font-medium text-slate-600">Result</th>
                <th className="px-3 py-2.5 font-medium text-slate-600">Unit</th>
                <th className="px-3 py-2.5 font-medium text-slate-600">Normal Range</th>
                <th className="px-3 py-2.5 font-medium text-slate-600">Date</th>
                <th className="px-3 py-2.5 font-medium text-slate-600">Abnormal</th>
                {!readOnly && (
                  <th className="px-3 py-2.5 font-medium text-slate-600 w-10"></th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={index}
                  className="border-b border-slate-100 last:border-b-0"
                >
                  <td className="px-3 py-2">
                    {readOnly ? (
                      <span className="text-slate-900">{row.testName}</span>
                    ) : (
                      <Input
                        value={row.testName}
                        onChange={(e) => updateRow(index, "testName", e.target.value)}
                        placeholder="e.g. CBC"
                        className="h-8 text-sm"
                      />
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {readOnly ? (
                      <span className={row.isAbnormal ? "text-red-600 font-medium" : "text-slate-900"}>
                        {row.result}
                      </span>
                    ) : (
                      <Input
                        value={row.result}
                        onChange={(e) => updateRow(index, "result", e.target.value)}
                        placeholder="Value"
                        className="h-8 text-sm"
                      />
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {readOnly ? (
                      <span className="text-slate-500">{row.unit || "-"}</span>
                    ) : (
                      <Input
                        value={row.unit || ""}
                        onChange={(e) => updateRow(index, "unit", e.target.value)}
                        placeholder="mg/dL"
                        className="h-8 text-sm"
                      />
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {readOnly ? (
                      <span className="text-slate-500">{row.normalRange || "-"}</span>
                    ) : (
                      <Input
                        value={row.normalRange || ""}
                        onChange={(e) => updateRow(index, "normalRange", e.target.value)}
                        placeholder="70-100"
                        className="h-8 text-sm"
                      />
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {readOnly ? (
                      <span className="text-slate-500">
                        {new Date(row.date).toLocaleDateString()}
                      </span>
                    ) : (
                      <Input
                        type="date"
                        value={row.date?.split("T")[0] || ""}
                        onChange={(e) => updateRow(index, "date", e.target.value)}
                        className="h-8 text-sm"
                      />
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {readOnly ? (
                      row.isAbnormal ? (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <span className="text-slate-400">-</span>
                      )
                    ) : (
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={row.isAbnormal || false}
                          onChange={(e) => updateRow(index, "isAbnormal", e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                        />
                      </label>
                    )}
                  </td>
                  {!readOnly && (
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => removeRow(index)}
                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
