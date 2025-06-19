import React from 'react';

const Stats = () => {
  const stats = [
    { number: '50K+', label: 'Active Users', description: 'Growing community worldwide' },
    { number: '2M+', label: 'Tasks Completed', description: 'Productivity milestones achieved' },
    { number: '99.9%', label: 'Uptime', description: 'Reliable service guarantee' },
    { number: '150+', label: 'Countries', description: 'Global presence and reach' }
  ];

  return (
    <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Trusted by teams worldwide
          </h2>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto">
            Join thousands of successful teams who have transformed their workflow with our platform.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center group">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 hover:bg-white/20 transition-all duration-300 hover:scale-105">
                <div className="text-4xl md:text-5xl font-bold text-white mb-2 group-hover:scale-110 transition-transform duration-300">
                  {stat.number}
                </div>
                <div className="text-xl font-semibold text-blue-100 mb-2">
                  {stat.label}
                </div>
                <div className="text-blue-200 text-sm">
                  {stat.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Stats;