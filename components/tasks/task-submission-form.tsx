'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadAndSubmit, createSubmission } from '@/lib/api/tasks';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Upload, X, File, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskSubmissionFormProps {
  taskId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'text/plain',
  'text/csv',
  'application/zip',
];

export function TaskSubmissionForm({ taskId, onSuccess, onCancel }: TaskSubmissionFormProps) {
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setError(null);
    
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      if (rejection.errors[0]?.code === 'file-too-large') {
        setError('File is too large. Maximum size is 10MB.');
      } else if (rejection.errors[0]?.code === 'file-invalid-type') {
        setError('File type not supported.');
      } else {
        setError('Invalid file.');
      }
      return;
    }
    
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE,
    accept: ALLOWED_TYPES.reduce((acc, type) => {
      acc[type] = [];
      return acc;
    }, {} as Record<string, string[]>),
  });

  const handleSubmit = async () => {
    if (!file && !notes.trim()) {
      setError('Please add a file or notes for your submission.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setUploadProgress(0);

      if (file) {
        await uploadAndSubmit(taskId, file, notes.trim() || undefined, (progress) => {
          setUploadProgress(progress);
        });
      } else {
        await createSubmission(taskId, notes.trim());
      }

      onSuccess?.();
    } catch (err) {
      console.error('Submission failed:', err);
      setError('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setUploadProgress(0);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">Notes (optional)</label>
        <Textarea
          placeholder="Add any notes about your submission..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">File (optional)</label>
        
        {!file ? (
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50",
              isSubmitting && "pointer-events-none opacity-50"
            )}
          >
            <input {...getInputProps()} disabled={isSubmitting} />
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-sm text-primary">Drop the file here...</p>
            ) : (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  Drag & drop a file here, or click to select
                </p>
                <p className="text-xs text-muted-foreground">
                  PDF, Word, Excel, PowerPoint, Images, Text, CSV, ZIP (max 10MB)
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <File className="h-8 w-8 text-primary flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
              </div>
              {!isSubmitting && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={removeFile}
                  className="h-8 w-8 flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            {isSubmitting && uploadProgress > 0 && (
              <div className="mt-3">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1 text-center">
                  {uploadProgress < 100 ? `Uploading... ${uploadProgress}%` : 'Processing...'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting || (!file && !notes.trim())}>
          {isSubmitting ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              Submitting...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Submit
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
