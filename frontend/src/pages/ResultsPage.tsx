import { FC } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/solid'
import WebsiteComments from '../components/WebsiteComments'

interface Source {
  url: string
  title: string
  publisher: string
  date: string
}

interface Claim {
  claim: string
  verdict: 'True' | 'False' | 'Misleading' | 'Unverified'
  explanation: string
  sources: Source[]
}

interface FactCheckResults {
  claims: Claim[]
  summary: string
  metadata: {
    analyzed_url: string
    analysis_date: string
    credibility_score: number
  }
}

interface VerdictBadgeProps {
  verdict: Claim['verdict']
}

const VerdictBadge: FC<VerdictBadgeProps> = ({ verdict }) => {
  const getVerdictInfo = (verdict: Claim['verdict']) => {
    switch (verdict) {
      case 'True':
        return {
          icon: CheckCircleIcon,
          color: 'bg-green-100 text-green-800',
          iconColor: 'text-green-500'
        }
      case 'False':
        return {
          icon: XCircleIcon,
          color: 'bg-red-100 text-red-800',
          iconColor: 'text-red-500'
        }
      case 'Misleading':
        return {
          icon: ExclamationTriangleIcon,
          color: 'bg-yellow-100 text-yellow-800',
          iconColor: 'text-yellow-500'
        }
      case 'Unverified':
        return {
          icon: QuestionMarkCircleIcon,
          color: 'bg-gray-100 text-gray-800',
          iconColor: 'text-gray-500'
        }
    }
  }

  const info = getVerdictInfo(verdict)
  const Icon = info.icon

  return (
    <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${info.color}`}>
      <Icon className={`h-4 w-4 ${info.iconColor}`} />
      {verdict}
    </span>
  )
}

const ResultsPage = () => {
  const location = useLocation()
  const results = location.state?.results as FactCheckResults

  if (!results) {
    return (
      <div className="max-w-2xl mx-auto mt-8 text-center">
        <p>No results found.</p>
        <Link to="/" className="text-blue-600 hover:underline mt-4 inline-block">
          Return to Home
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Website Credibility Card */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">Website Credibility</h2>
        <div className="flex items-center gap-2 mb-3">
          <CheckCircleIcon className="h-6 w-6 text-green-500" />
          <span className="text-xl">
            Credibility Score: {results.metadata.credibility_score}%
          </span>
        </div>
        <p className="text-gray-700 mb-4">{results.summary}</p>
        
        {/* Community Feedback - Only show for URLs */}
        {results.metadata.analyzed_url.startsWith('http') && (
          <WebsiteComments url={results.metadata.analyzed_url} />
        )}
        
        <p className="text-sm text-gray-500 mt-4">
          Last updated: {new Date(results.metadata.analysis_date).toLocaleString()}
        </p>
      </div>

      {/* Fact Check Results Card */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6">Fact Check Results</h2>
        <div className="space-y-8">
          {results.claims.map((claim, index) => (
            <div key={index} className="border-b border-gray-200 last:border-0 pb-6 last:pb-0">
              <div className="flex items-start justify-between gap-4 mb-3">
                <h3 className="text-lg font-semibold">Claim: {claim.claim}</h3>
                <VerdictBadge verdict={claim.verdict} />
              </div>
              <p className="text-gray-700 mb-4">{claim.explanation}</p>
              {claim.sources.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-gray-600 mb-2">Sources:</h4>
                  <ul className="space-y-2">
                    {claim.sources.map((source, sourceIndex) => (
                      <li key={sourceIndex} className="text-sm">
                        <a
                          href={source.url}
                          className="text-blue-600 hover:underline font-medium"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {source.title}
                        </a>
                        <p className="text-gray-500">
                          {source.publisher} • {source.date}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="text-center">
        <Link
          to="/"
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Check Another URL
        </Link>
      </div>
    </div>
  )
}

export default ResultsPage
