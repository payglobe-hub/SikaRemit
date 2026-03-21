'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImageUploadProps {
  onImageSelect: (file: File) => void
  currentImage?: string
  className?: string
  maxSize?: number // in bytes
}

export function ImageUpload({
  onImageSelect,
  currentImage,
  className,
  maxSize = 5 * 1024 * 1024, // 5MB default
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentImage || null)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: any[]) => {
    setError(null)
    
    // Handle file rejections
    if (fileRejections.length > 0) {
      const rejection = fileRejections[0]
      if (rejection.errors.some((e: any) => e.code === 'file-too-large')) {
        setError('File size must be less than 5MB')
      } else if (rejection.errors.some((e: any) => e.code === 'file-invalid-type')) {
        setError('Only JPEG, PNG, and WebP images are allowed')
      } else {
        setError('Invalid file format')
      }
      return
    }

    const file = acceptedFiles[0]
    if (file) {
      // Create preview
      const reader = new FileReader()
      reader.onload = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      
      onImageSelect(file)
    }
  }, [onImageSelect])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp']
    },
    maxSize,
    multiple: false,
    disabled: !!preview
  })

  const removeImage = () => {
    setPreview(null)
    setError(null)
    // Note: We don't call onImageSelect(undefined) here
    // because the parent should handle null/undefined cases
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardContent className="p-4">
        {preview ? (
          <div className="space-y-4">
            <div className="relative">
              <img
                src={preview}
                alt="Product preview"
                className="w-full h-48 object-cover rounded-lg"
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={removeImage}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-gray-600 text-center">
              Product image selected
            </p>
          </div>
        ) : (
          <div
            {...getRootProps()}
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
              isDragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            )}
          >
            <input {...getInputProps()} />
            <div className="space-y-4">
              <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                {isDragActive ? (
                  <Upload className="h-6 w-6 text-blue-500" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-gray-400" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">
                  {isDragActive
                    ? 'Drop the image here'
                    : 'Drag & drop a product image here'
                  }
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  or click to browse
                </p>
              </div>
              <div className="text-xs text-gray-400">
                <p>Maximum file size: 5MB</p>
                <p>Accepted formats: JPEG, PNG, WebP</p>
              </div>
            </div>
          </div>
        )}
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
