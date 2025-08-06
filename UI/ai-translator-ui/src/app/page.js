import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white text-gray-800 font-sans">
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        {/* Header */}
        <div className="flex flex-col items-center justify-center mb-10">
          <div className="text-purple-600 text-5xl mb-4">📖</div>
          <h1 className="text-4xl font-bold text-purple-700 mb-4">Bible Translator</h1>
          <p className="text-lg max-w-2xl text-gray-600">
            Collaborative platform for translating the Bible into Indian languages. Join our community of translators in making God’s word accessible to everyone.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex justify-center space-x-4 mb-16">
        <Link href="/register"><button className="bg-purple-600 text-white px-4 py-2 rounded">Get Started</button>
          </Link>
          <Link href="/login">
            <button className="border border-gray-400 px-6 py-3 rounded-md font-medium hover:bg-gray-100 transition">
              Sign In
            </button>
          </Link>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="border rounded-xl p-6 shadow-sm hover:shadow-md transition">
            <div className="text-purple-600 text-2xl mb-2">👥</div>
            <h3 className="text-lg font-bold mb-1">Collaborative</h3>
            <p className="text-gray-600 text-sm">
              Work together with fellow translators, reviewers, and linguists to ensure accurate translations.
            </p>
          </div>
          <div className="border rounded-xl p-6 shadow-sm hover:shadow-md transition">
            <div className="text-purple-600 text-2xl mb-2">🌐</div>
            <h3 className="text-lg font-bold mb-1">Multi-Language</h3>
            <p className="text-gray-600 text-sm">
              Support for all major Indian languages including Hindi, Tamil, Telugu, Bengali, and more.
            </p>
          </div>
          <div className="border rounded-xl p-6 shadow-sm hover:shadow-md transition">
            <div className="text-purple-600 text-2xl mb-2">✔️</div>
            <h3 className="text-lg font-bold mb-1">Quality Assured</h3>
            <p className="text-gray-600 text-sm">
              Built-in review process and quality checks to ensure theologically accurate translations.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-gray-50 py-10 rounded-xl shadow-inner flex flex-col md:flex-row justify-around items-center space-y-6 md:space-y-0">
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-700">150+</div>
            <div className="text-sm text-gray-600">Active Translators</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">12</div>
            <div className="text-sm text-gray-600">Languages Supported</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">25</div>
            <div className="text-sm text-gray-600">Completed Books</div>
          </div>
        </div>
      </div>
    </main>
  )
}
