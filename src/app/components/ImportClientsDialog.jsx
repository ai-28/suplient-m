"use client"

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Upload, FileText, CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/app/context/LanguageContext";
import { Card, CardContent } from "@/app/components/ui/card";

// Column name variations for auto-detection
const COLUMN_VARIATIONS = {
  name: ['contact name', 'name', 'client name', 'full name', 'contact', 'client'],
  email: ['email', 'e-mail', 'email address', 'mail'],
  phone: ['phone', 'phone number', 'mobile', 'telephone', 'tel', 'contact number'],
  address: ['address', 'location', 'street', 'street address', 'city', 'address line'],
  dateOfBirth: ['date of birth', 'birthdate', 'birth date', 'dob', 'date of birth', 'born'],
  notes: ['notes', 'note', 'description', 'concerns', 'comments', 'remarks']
};

// Remove BOM (Byte Order Mark) and ensure UTF-8 encoding
function normalizeText(text) {
  if (!text) return '';
  // Remove UTF-8 BOM if present
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1);
  }
  return text;
}

// Try to decode file with multiple encodings
async function readFileWithEncoding(file) {
  return new Promise((resolve, reject) => {
    // First, try reading as ArrayBuffer to detect encoding
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target.result;
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Check for UTF-8 BOM
        if (uint8Array.length >= 3 && 
            uint8Array[0] === 0xEF && 
            uint8Array[1] === 0xBB && 
            uint8Array[2] === 0xBF) {
          // UTF-8 with BOM - decode and remove BOM
          const decoder = new TextDecoder('utf-8');
          const text = decoder.decode(uint8Array.slice(3));
          resolve(text);
          return;
        }
        
        // Try UTF-8 first (most common, handles Danish characters correctly)
        const utf8Decoder = new TextDecoder('utf-8');
        const utf8Text = utf8Decoder.decode(uint8Array);
        
        // Check if UTF-8 decoding produced replacement characters ()
        // This indicates the file might be in a different encoding
        // Unicode replacement character is U+FFFD
        const hasReplacementChars = utf8Text.includes('\uFFFD');
        
        if (!hasReplacementChars) {
          // UTF-8 looks good
          resolve(utf8Text);
          return;
        }
        
        // UTF-8 had issues, try Windows-1252 (common for Excel exports on Windows)
        // Windows-1252 is a superset of ISO-8859-1 and handles Danish characters
        try {
          const windowsDecoder = new TextDecoder('windows-1252');
          const windowsText = windowsDecoder.decode(uint8Array);
          resolve(windowsText);
        } catch (e) {
          // Fallback to UTF-8 even if it has issues (better than nothing)
          resolve(utf8Text);
        }
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

// CSV parser that handles multi-line quoted fields
function parseCSV(text) {
  if (!text || text.trim().length === 0) return { headers: [], rows: [] };

  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote (double quote)
        currentField += '"';
        i += 2;
        continue;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        i++;
        continue;
      }
    }

    if (char === ',' && !inQuotes) {
      // Field separator
      currentRow.push(currentField.trim());
      currentField = '';
      i++;
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      // Row separator (only when not in quotes)
      if (char === '\r' && nextChar === '\n') {
        // Handle Windows line endings (\r\n)
        i += 2;
      } else {
        i++;
      }
      
      // Add current field to row
      if (currentField.length > 0 || currentRow.length > 0) {
        currentRow.push(currentField.trim());
        if (currentRow.some(field => field.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      }
      continue;
    }

    // Regular character
    currentField += char;
    i++;
  }

  // Handle last field and row
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(field => field.length > 0)) {
      rows.push(currentRow);
    }
  }

  if (rows.length === 0) return { headers: [], rows: [] };

  const headers = rows[0];
  const dataRows = rows.slice(1);

  return { headers, rows: dataRows };
}

// Auto-detect column mapping
function detectColumnMapping(csvHeaders) {
  const mapping = {};
  const normalizedHeaders = csvHeaders.map(h => h.toLowerCase().trim());

  Object.keys(COLUMN_VARIATIONS).forEach(field => {
    const variations = COLUMN_VARIATIONS[field];
    const foundIndex = normalizedHeaders.findIndex(header => 
      variations.some(variation => {
        const normalizedHeader = header.toLowerCase().trim();
        return normalizedHeader === variation || 
               normalizedHeader.includes(variation) || 
               variation.includes(normalizedHeader);
      })
    );

    if (foundIndex !== -1) {
      mapping[field] = csvHeaders[foundIndex]; // Use original case
    }
  });

  return mapping;
}

export function ImportClientsDialog({ onClientsImported, targetCoachId = null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [csvData, setCsvData] = useState(null);
  const [columnMapping, setColumnMapping] = useState({});
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(null);
  const fileInputRef = useRef(null);
  const t = useTranslation();

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Invalid file type', {
        description: 'Please select a CSV file'
      });
      return;
    }

    setSelectedFile(file);

    // Use improved encoding detection for better Danish character support
    readFileWithEncoding(file)
      .then((text) => {
        try {
          // Normalize text (remove BOM if present)
          text = normalizeText(text);
          const { headers, rows } = parseCSV(text);

          if (headers.length === 0) {
            toast.error('Invalid CSV file', {
              description: 'CSV file appears to be empty or invalid'
            });
            return;
          }

          setCsvHeaders(headers);
          
          // Auto-detect column mapping
          const autoMapping = detectColumnMapping(headers);
          setColumnMapping(autoMapping);

          // Show preview (first 5 rows)
          setPreviewRows(rows.slice(0, 5));
          setCsvData({ headers, rows });

          toast.success('CSV file loaded', {
            description: `Found ${rows.length} rows. Please verify column mapping.`
          });
        } catch (error) {
          console.error('Error parsing CSV:', error);
          toast.error('Error parsing CSV', {
            description: error.message || 'Failed to parse CSV file'
          });
        }
      })
      .catch((error) => {
        console.error('Error reading file:', error);
        toast.error('Error reading file', {
          description: error.message || 'Failed to read CSV file'
        });
      });
  };

  const validateMapping = () => {
    const requiredFields = ['name', 'email', 'phone'];
    const missing = requiredFields.filter(field => !columnMapping[field]);
    
    if (missing.length > 0) {
      toast.error('Missing required mappings', {
        description: `Please map the following fields: ${missing.join(', ')}`
      });
      return false;
    }
    return true;
  };

  const handleImport = async () => {
    if (!csvData || !selectedFile) {
      toast.error('No file selected');
      return;
    }

    if (!validateMapping()) {
      return;
    }

    setIsImporting(true);
    setImportProgress({ total: csvData.rows.length, processed: 0, successful: 0, failed: 0 });

    try {
      const formData = new FormData();
      formData.append('csv', selectedFile);
      formData.append('mapping', JSON.stringify(columnMapping));
      if (targetCoachId) {
        formData.append('targetCoachId', targetCoachId);
      }

      const response = await fetch('/api/clients/import', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Import failed');
      }

      const { successful, failed, errors } = result;

      if (successful > 0) {
        toast.success('Import completed', {
          description: `Successfully imported ${successful} client(s)${failed > 0 ? `. ${failed} failed.` : ''}`
        });
        
        setIsOpen(false);
        setSelectedFile(null);
        setCsvData(null);
        setColumnMapping({});
        setCsvHeaders([]);
        setPreviewRows([]);
        
        if (onClientsImported) {
          onClientsImported();
        }
      } else {
        toast.error('Import failed', {
          description: 'No clients were imported. Please check the errors and try again.'
        });
      }

      if (errors && errors.length > 0) {
        console.error('Import errors:', errors);
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Import failed', {
        description: error.message || 'An error occurred during import'
      });
    } finally {
      setIsImporting(false);
      setImportProgress(null);
    }
  };

  const getPreviewValue = (row, field) => {
    const mappedColumn = columnMapping[field];
    if (!mappedColumn) return '-';
    const index = csvHeaders.indexOf(mappedColumn);
    return index !== -1 && row[index] ? row[index] : '-';
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Import from CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Import Clients from CSV
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Upload */}
          <div className="space-y-2">
            <Label>Select CSV File</Label>
            <div className="flex items-center gap-4">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                {selectedFile ? selectedFile.name : 'Choose CSV File'}
              </Button>
              {selectedFile && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  {csvData?.rows.length || 0} rows found
                </div>
              )}
            </div>
          </div>

          {/* Column Mapping */}
          {csvHeaders.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <AlertCircle className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Map CSV Columns</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Name <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={columnMapping.name || ''}
                    onValueChange={(value) => setColumnMapping({ ...columnMapping, name: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {csvHeaders.map((header, idx) => (
                        <SelectItem key={idx} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={columnMapping.email || ''}
                    onValueChange={(value) => setColumnMapping({ ...columnMapping, email: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {csvHeaders.map((header, idx) => (
                        <SelectItem key={idx} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Phone <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={columnMapping.phone || ''}
                    onValueChange={(value) => setColumnMapping({ ...columnMapping, phone: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {csvHeaders.map((header, idx) => (
                        <SelectItem key={idx} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Address/Location (Optional)</Label>
                  <Select
                    value={columnMapping.address || '__none__'}
                    onValueChange={(value) => setColumnMapping({ ...columnMapping, address: value === '__none__' ? undefined : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select column (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {csvHeaders.map((header, idx) => (
                        <SelectItem key={idx} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Date of Birth (Optional)</Label>
                  <Select
                    value={columnMapping.dateOfBirth || '__none__'}
                    onValueChange={(value) => setColumnMapping({ ...columnMapping, dateOfBirth: value === '__none__' ? undefined : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select column (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {csvHeaders.map((header, idx) => (
                        <SelectItem key={idx} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Notes (Optional)</Label>
                  <Select
                    value={columnMapping.notes || '__none__'}
                    onValueChange={(value) => setColumnMapping({ ...columnMapping, notes: value === '__none__' ? undefined : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select column (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {csvHeaders.map((header, idx) => (
                        <SelectItem key={idx} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Preview */}
          {previewRows.length > 0 && Object.keys(columnMapping).length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Preview (First 5 rows)</Label>
              <Card>
                <CardContent className="p-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Name</th>
                          <th className="text-left p-2">Email</th>
                          <th className="text-left p-2">Phone</th>
                          {columnMapping.address && <th className="text-left p-2">Address</th>}
                          {columnMapping.dateOfBirth && <th className="text-left p-2">Date of Birth</th>}
                          {columnMapping.notes && <th className="text-left p-2">Notes</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((row, idx) => (
                          <tr key={idx} className="border-b">
                            <td className="p-2">{getPreviewValue(row, 'name')}</td>
                            <td className="p-2">{getPreviewValue(row, 'email')}</td>
                            <td className="p-2">{getPreviewValue(row, 'phone')}</td>
                            {columnMapping.address && (
                              <td className="p-2">{getPreviewValue(row, 'address')}</td>
                            )}
                            {columnMapping.dateOfBirth && (
                              <td className="p-2">{getPreviewValue(row, 'dateOfBirth')}</td>
                            )}
                            {columnMapping.notes && (
                              <td className="p-2">{getPreviewValue(row, 'notes')}</td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Import Progress */}
          {importProgress && (
            <div className="space-y-2">
              <Label>Import Progress</Label>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Processing: {importProgress.processed} / {importProgress.total}</span>
                  <span className="text-green-600">Success: {importProgress.successful}</span>
                  <span className="text-red-600">Failed: {importProgress.failed}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${(importProgress.processed / importProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isImporting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleImport}
              disabled={!csvData || !selectedFile || isImporting || !columnMapping.name || !columnMapping.email || !columnMapping.phone}
              className="gap-2"
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Import Clients
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

