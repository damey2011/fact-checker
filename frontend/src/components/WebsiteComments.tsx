import { useState, useEffect } from 'react'
import { StarIcon } from '@heroicons/react/24/solid'
import { StarIcon as StarIconOutline, ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline'

interface Comment {
  id: number
  commenter_name: string
  comment: string
  rating: number
  created_at: string
  domain: string
}

interface CommentsResponse {
  comments: Comment[]
  average_rating: number
}

interface WebsiteCommentsProps {
  url: string
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

const StarRating = ({ rating }: { rating: number }) => {
  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star}>
          {star <= rating ? (
            <StarIcon className="h-5 w-5 text-yellow-400" />
          ) : (
            <StarIconOutline className="h-5 w-5 text-yellow-400" />
          )}
        </span>
      ))}
    </div>
  )
}

const WebsiteComments = ({ url }: WebsiteCommentsProps) => {
  const [comments, setComments] = useState<Comment[]>([])
  const [averageRating, setAverageRating] = useState(0)
  const [newComment, setNewComment] = useState('')
  const [commenterName, setCommenterName] = useState('')
  const [rating, setRating] = useState(5)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  const fetchComments = async () => {
    try {
      const encodedUrl = encodeURIComponent(url)
      const response = await fetch(`${API_URL}/comments/${encodedUrl}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data: CommentsResponse = await response.json()
      setComments(data.comments)
      setAverageRating(data.average_rating)
    } catch (err) {
      console.error('Error fetching comments:', err)
      setError(err instanceof Error ? err.message : 'Failed to load comments')
    }
  }

  useEffect(() => {
    fetchComments()
  }, [url])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_URL}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commenter_name: commenterName,
          comment: newComment,
          rating,
          url,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to post comment')
      }

      // Reset form
      setNewComment('')
      setCommenterName('')
      setRating(5)
      
      // Refresh comments
      await fetchComments()
    } catch (err) {
      console.error('Error posting comment:', err)
      setError(err instanceof Error ? err.message : 'Failed to post comment')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header with toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-6 flex items-center justify-between bg-gradient-to-r from-blue-50 to-white hover:bg-blue-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">Community Feedback</h2>
          <div className="flex items-center gap-2 text-gray-600">
            <StarIcon className="h-5 w-5 text-yellow-400" />
            <span className="text-lg font-medium">
              {averageRating.toFixed(1)} ({comments.length} {comments.length === 1 ? 'review' : 'reviews'})
            </span>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUpIcon className="h-6 w-6 text-gray-400" />
        ) : (
          <ChevronDownIcon className="h-6 w-6 text-gray-400" />
        )}
      </button>

      {/* Expandable content */}
      {isExpanded && (
        <div className="p-6 border-t border-gray-100">
          {/* Comment Form */}
          <form onSubmit={handleSubmit} className="mb-8 space-y-6 bg-gray-50 p-6 rounded-lg">
            <h3 className="font-semibold text-lg">Add Your Review</h3>
            <div>
              <label htmlFor="name" className="form-label">
                Your Name
              </label>
              <input
                type="text"
                id="name"
                value={commenterName}
                onChange={(e) => setCommenterName(e.target.value)}
                className="form-input"
                placeholder="Enter your name"
                required
              />
            </div>

            <div>
              <label htmlFor="rating" className="form-label">
                Rating
              </label>
              <div className="mt-2 flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="focus:outline-none hover:scale-110 transition-transform"
                  >
                    {star <= rating ? (
                      <StarIcon className="h-8 w-8 text-yellow-400" />
                    ) : (
                      <StarIconOutline className="h-8 w-8 text-yellow-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="comment" className="form-label">
                Your Comment
              </label>
              <textarea
                id="comment"
                rows={3}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="form-textarea"
                placeholder="Share your thoughts..."
                required
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoading ? 'Posting...' : 'Post Review'}
            </button>
          </form>

          {/* Comments List */}
          <div className="space-y-6">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-4 p-4 bg-white rounded-lg shadow-sm border border-gray-100">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 font-medium">
                      {comment.commenter_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="flex-grow">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900">{comment.commenter_name}</span>
                    <div className="flex items-center">
                      <StarRating rating={comment.rating} />
                    </div>
                  </div>
                  <p className="text-gray-700 mb-2">{comment.comment}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(comment.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default WebsiteComments 