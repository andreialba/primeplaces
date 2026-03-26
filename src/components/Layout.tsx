import { Outlet, Link } from 'react-router-dom';

const SEO_LOCATIONS = [
  "New York", "London", "Paris", "Tokyo", "Dubai", "Singapore", "Barcelona", "Los Angeles",
  "Rome", "Seoul", "Amsterdam", "Madrid", "Prague", "Berlin", "Hong Kong", "Bangkok",
  "Istanbul", "Vienna", "Milan", "Taipei", "Osaka", "Las Vegas", "Miami", "Chicago",
  "Toronto", "Sydney", "Melbourne", "San Francisco", "Washington DC", "Boston", "Seattle",
  "Vancouver", "Montreal", "Munich", "Frankfurt", "Zurich", "Geneva", "Stockholm", "Copenhagen",
  "Oslo", "Helsinki", "Dublin", "Edinburgh", "Manchester", "Brussels", "Lisbon", "Porto",
  "Athens", "Budapest", "Warsaw"
];

export default function Layout() {
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-neutral-900">
      <header className="bg-white sticky top-0 z-50 border-b border-neutral-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
          <Link to="/" className="text-2xl font-semibold tracking-tight text-neutral-900">
            PrimePlaces
          </Link>
        </div>
      </header>
      
      <main className="flex-1 w-full bg-neutral-50">
        <Outlet />
      </main>
      
      <footer className="bg-white py-12 mt-auto border-t border-neutral-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h3 className="text-lg font-medium text-neutral-900 mb-6">Discover Best Rated Places</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-y-4 gap-x-6">
              {SEO_LOCATIONS.map(location => (
                <Link 
                  key={location} 
                  to={`/${location.toLowerCase().replace(/\s+/g, '-')}`}
                  className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
                >
                  Best rated places in {location}
                </Link>
              ))}
            </div>
          </div>
          <div className="text-center text-sm text-neutral-500 pt-8 border-t border-neutral-100">
            <p>&copy; {new Date().getFullYear()} PrimePlaces. Discover the best places on Google Maps.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
