import FactCheckForm from '../components/FactCheckForm'

const HomePage = () => {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-8">
        AI-Powered Fact Checker
      </h1>
      <p className="text-gray-600 text-center mb-8">
        Verify claims from social media posts, blogs, and other online content using AI.
      </p>
      <FactCheckForm />
    </div>
  )
}

export default HomePage
