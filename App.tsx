
import React from 'react';
import Header from './components/Header';
import GeneratorTabs from './components/GeneratorTabs';
import Footer from './components/Footer';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <GeneratorTabs />
      </main>
      <Footer />
    </div>
  );
};

export default App;
