import React, { useState, useEffect } from 'react'
import {
  Button,
  Card,
  Flex,
  Heading,
  Text,
  IconButton,
  Grid,
  Dialog,
  TextField,
  Separator
} from '@radix-ui/themes'
import {
  LucideDownload,
  LucideTrash2,
  LucideSearch,
  LucideX,
  LucideCalendar,
  LucideTag,
  LucideImage
} from 'lucide-react'
import { sendToBackground } from '@plasmohq/messaging'
import type { StoredAnnotation } from '~services/indexeddb-storage'

interface AnnotationGalleryProps {
  onAnnotationSelect?: (annotation: StoredAnnotation) => void
  onClose?: () => void
}

const AnnotationGallery: React.FC<AnnotationGalleryProps> = ({
  onAnnotationSelect,
  onClose
}) => {
  const [annotations, setAnnotations] = useState<StoredAnnotation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedAnnotation, setSelectedAnnotation] = useState<StoredAnnotation | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [storageInfo, setStorageInfo] = useState<any>(null)

  // Helper function to normalize dates in annotations
  const normalizeAnnotationDates = (annotations: any[]): StoredAnnotation[] => {
    return annotations.map(annotation => ({
      ...annotation,
      createdAt: annotation.createdAt instanceof Date
        ? annotation.createdAt
        : new Date(annotation.createdAt),
      updatedAt: annotation.updatedAt instanceof Date
        ? annotation.updatedAt
        : new Date(annotation.updatedAt)
    }))
  }

  // Load annotations on mount
  useEffect(() => {
    loadAnnotations()
  }, [])

  const loadAnnotations = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await sendToBackground({
        name: 'get-annotations',
        body: { type: 'recent', limit: 50 }
      })

      if (response?.type === 'ANNOTATIONS_RETRIEVED') {
        // Normalize dates before setting state
        const normalizedAnnotations = normalizeAnnotationDates(response.data.annotations)
        setAnnotations(normalizedAnnotations)
        setStorageInfo(response.data.storageInfo)
      } else if (response?.type === 'RETRIEVAL_ERROR') {
        setError(response.data.error)
      } else {
        setError('Failed to load annotations')
      }
    } catch (err) {
      console.error('Error loading annotations:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = (annotation: StoredAnnotation) => {
    const link = document.createElement('a')
    link.href = annotation.dataUrl
    link.download = `annotation-${annotation.title.replace(/[^a-zA-Z0-9]/g, '_')}-${Date.now()}.png`
    link.click()
  }

  const handleDelete = async (annotation: StoredAnnotation) => {
    if (!confirm(`Are you sure you want to delete "${annotation.title}"?`)) {
      return
    }

    try {
      const response = await sendToBackground({
        name: 'delete-annotation',
        body: { id: annotation.id }
      })

      if (response?.type === 'ANNOTATION_DELETED') {
        // Remove from local state
        setAnnotations(prev => prev.filter(a => a.id !== annotation.id))
        setSelectedAnnotation(null)
      } else if (response?.type === 'DELETION_ERROR') {
        setError(response.data.error)
      } else {
        setError('Failed to delete annotation')
      }
    } catch (err) {
      console.error('Error deleting annotation:', err)
      setError('Failed to delete annotation')
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadAnnotations()
      return
    }

    try {
      setLoading(true)

      const response = await sendToBackground({
        name: 'get-annotations',
        body: {
          type: 'search',
          query: { text: searchQuery.trim() }
        }
      })

      if (response?.type === 'ANNOTATIONS_RETRIEVED') {
        // Normalize dates before setting state
        const normalizedAnnotations = normalizeAnnotationDates(response.data.annotations)
        setAnnotations(normalizedAnnotations)
      } else if (response?.type === 'RETRIEVAL_ERROR') {
        setError(response.data.error)
      }
    } catch (err) {
      console.error('Error searching annotations:', err)
      setError('Search failed')
    } finally {
      setLoading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return 'Unknown date'

    try {
      const dateObj = date instanceof Date ? date : new Date(date)

      // Check if the date is valid
      if (isNaN(dateObj.getTime())) {
        return 'Invalid date'
      }

      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(dateObj)
    } catch (error) {
      console.error('Error formatting date:', error)
      return 'Date error'
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Loading annotations...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>
        <Button onClick={loadAnnotations}>Try Again</Button>
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-background)' }}>
      {/* Header */}
      <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border)' }}>
        <Flex justify="between" align="center" mb="16px">
          <Heading size="4">My Annotations</Heading>
          {onClose && (
            <IconButton size="2" variant="soft" onClick={onClose}>
              <LucideX size={16} />
            </IconButton>
          )}
        </Flex>

        {/* Search Bar */}
        <Flex gap="8px">
          <TextField.Root
            placeholder="Search annotations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            style={{ flex: 1 }}
          >
            <TextField.Slot>
              <LucideSearch size={16} />
            </TextField.Slot>
          </TextField.Root>
          <Button onClick={handleSearch}>Search</Button>
          <Button variant="soft" onClick={loadAnnotations}>Reset</Button>
        </Flex>

        {/* Storage Info */}
        {storageInfo && (
          <Text size="1" color="gray" mt="8px">
            {storageInfo.annotationCount} annotations • {formatFileSize(storageInfo.usage)} used
          </Text>
        )}
      </div>

      {/* Annotations Grid */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {annotations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <LucideImage size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
            <Heading size="3" color="gray" mb="8px">No annotations yet</Heading>
            <Text color="gray">
              Your saved annotations will appear here. Start capturing and annotating to build your collection!
            </Text>
          </div>
        ) : (
          <Grid columns={{ initial: '1', md: '2', lg: '3', xl: '4' }} gap="16px">
            {annotations.map((annotation) => (
              <Card
                key={annotation.id}
                style={{
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
                }}
                onClick={() => {
                  setSelectedAnnotation(annotation)
                  onAnnotationSelect?.(annotation)
                }}
              >
                {/* Thumbnail */}
                <div style={{
                  width: '100%',
                  height: '280px',
                  backgroundImage: `url(${annotation.thumbnailUrl || annotation.dataUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  borderRadius: '8px 8px 0 0',
                  marginBottom: '12px'
                }} />

                <div style={{ padding: '0 8px 8px' }}>
                  {/* Title */}
                  <Text
                    size="2"
                    weight="medium"
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      marginBottom: '4px'
                    }}
                  >
                    {annotation.title}
                  </Text>

                  {/* Metadata */}
                  <Flex direction="column" gap="4px">
                    <Flex align="center" gap="4px">
                      <LucideCalendar size={12} />
                      <Text size="1" color="gray">
                        {formatDate(annotation.createdAt)}
                      </Text>
                    </Flex>

                    <Flex align="center" gap="4px">
                      <LucideTag size={12} />
                      <Text size="1" color="gray">
                        {annotation.tags.length > 0 ? annotation.tags.join(', ') : 'No tags'}
                      </Text>
                    </Flex>

                    <Text size="1" color="gray">
                      {formatFileSize(annotation.fileSize)}
                    </Text>
                  </Flex>

                  {/* Actions */}
                  <Flex gap="8px" mt="12px">
                    <Button
                      size="1"
                      variant="soft"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDownload(annotation)
                      }}
                    >
                      <LucideDownload size={12} />
                      Download
                    </Button>
                    <Button
                      size="1"
                      variant="soft"
                      color="red"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(annotation)
                      }}
                    >
                      <LucideTrash2 size={12} />
                      Delete
                    </Button>
                  </Flex>
                </div>
              </Card>
            ))}
          </Grid>
        )}
      </div>

      {/* Annotation Detail Dialog */}
      <Dialog.Root open={!!selectedAnnotation} onOpenChange={(open) => !open && setSelectedAnnotation(null)}>
        <Dialog.Content style={{ backgroundColor: 'var(--accent-2)', maxWidth: '800px', maxHeight: '90vh' }}>
          <Dialog.Title>
            <Flex justify="between" align="center">
              {selectedAnnotation?.title}
              <Dialog.Close>
                <LucideX size={20} />
              </Dialog.Close>
            </Flex>
          </Dialog.Title>

          {selectedAnnotation && (
            <div style={{ marginTop: '16px' }}>
              {/* Full Image */}
              <Flex style={{
                flex: 1,
                width: '100%',
                height: '700px',
                maxHeight: '400px',
                backgroundImage: `url(${selectedAnnotation.dataUrl})`,
                backgroundSize: 'contain',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                borderRadius: '8px',
                marginBottom: '16px'
              }} />

              {/* Details */}
              <div style={{ padding: '16px 0' }}>
                <Separator mb="16px" />

                <Grid columns="2" gap="16px">
                  <div>
                    <Text size="1" color="gray" mb="4px">Created</Text>
                    <Text size="2">{formatDate(selectedAnnotation.createdAt)}</Text>
                  </div>

                  <div>
                    <Text size="1" color="gray" mb="4px">Size</Text>
                    <Text size="2">{formatFileSize(selectedAnnotation.fileSize)}</Text>
                  </div>

                  <div>
                    <Text size="1" color="gray" mb="4px">Dimensions</Text>
                    <Text size="2">{selectedAnnotation.width} × {selectedAnnotation.height}</Text>
                  </div>

                  <div>
                    <Text size="1" color="gray" mb="4px">Source</Text>
                    <Text size="2" style={{ wordBreak: 'break-all' }}>
                      {selectedAnnotation.url || 'Unknown'}
                    </Text>
                  </div>
                </Grid>

                {selectedAnnotation.tags.length > 0 && (
                  <div style={{ marginTop: '16px' }}>
                    <Text size="1" color="gray" mb="8px">Tags</Text>
                    <Flex gap="8px" wrap="wrap">
                      {selectedAnnotation.tags.map((tag, index) => (
                        <span
                          key={index}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: 'var(--color-accent-4)',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </Flex>
                  </div>
                )}

                {selectedAnnotation.description && (
                  <div style={{ marginTop: '16px' }}>
                    <Text size="1" color="gray" mb="8px">Description</Text>
                    <Text size="2">{selectedAnnotation.description}</Text>
                  </div>
                )}
              </div>

              {/* Actions */}
              <Flex gap="8px" mt="16px">
                <Button onClick={() => handleDownload(selectedAnnotation)}>
                  <LucideDownload size={16} style={{ marginRight: '8px' }} />
                  Download
                </Button>
                <Button
                  variant="soft"
                  color="red"
                  onClick={() => {
                    handleDelete(selectedAnnotation)
                    setSelectedAnnotation(null)
                  }}
                >
                  <LucideTrash2 size={16} style={{ marginRight: '8px' }} />
                  Delete
                </Button>
              </Flex>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Root>
    </div>
  )
}

export default AnnotationGallery
