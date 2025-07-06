import Link from 'next/link';

export default function Home() {
  return (
    <div 
      className="relative min-h-screen flex flex-col justify-between overflow-hidden"
      style={{
        backgroundImage: 'url("/angel_whitev3.jpeg")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-8 pt-20 pb-10 max-w-7xl mx-auto w-full">
        {/* Header - Left aligned */}
        <div className="w-full max-w-4xl text-left mb-20 pl-8">
          <h1 className="font-faith text-6xl md:text-8xl font-extrabold text-black mb-6 drop-shadow-sm tracking-wider">protect.it</h1>
          <p className="text-xl md:text-2xl text-black mb-10 tracking-wide leading-relaxed italic">Where <span className="font-faith">Risk</span> meets <span className="font-faith">Collective Intelligence</span>.</p>
          <h2 className="text-3xl md:text-4xl font-semibold text-black mb-12 leading-tight" style={{textShadow: '0 0 20px rgba(255,255,255,0.8), 0 0 40px rgba(255,255,255,0.6), 0 0 60px rgba(255,255,255,0.4)'}}>
            The first truly <span className="font-faith">decentralized</span> smart contract<br /><span className="font-faith">insurance</span> protocol, ruled by <span className="font-faith">the market</span>.
          </h2>
          <div className="flex flex-col sm:flex-row gap-8 mb-16">
            <Link href="/markets" className="px-8 py-4 rounded-xl bg-[#00FA9A] text-black font-bold text-lg shadow-2xl shadow-[#00FA9A]/30 hover:bg-[#00FA9A]/80 hover:shadow-xl transition-all duration-300 transform hover:scale-105" style={{filter: 'drop-shadow(0 0 15px rgba(0,250,154,0.4))'}}>
              Get Started
            </Link>
            <a href="https://github.com/seyl3/protect.it" target="_blank" rel="noopener noreferrer" className="px-8 py-4 rounded-xl bg-black text-white font-bold text-lg border-2 border-black shadow-2xl shadow-black/30 hover:bg-gray-800 hover:shadow-xl transition-all duration-300 transform hover:scale-105" style={{filter: 'drop-shadow(0 0 15px rgba(0,0,0,0.4))'}}>
              GitHub
            </a>
          </div>
        </div>

        {/* Features - Spread equally */}
        <div className="w-full max-w-6xl flex flex-col md:flex-row gap-10 justify-between items-stretch mb-20 px-8">
          <div className="flex-1 bg-white bg-opacity-40 backdrop-blur-md rounded-2xl p-10 border-2 border-black shadow-2xl shadow-white/50 text-left hover:bg-white hover:bg-opacity-60 transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 cursor-pointer" style={{filter: 'drop-shadow(0 0 25px rgba(255,255,255,0.4))'}}>
            <div className="flex items-center mb-4">
              <svg className="w-8 h-8 mr-4 text-black" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L8 6h3v6h2V6h3l-4-4zM8 18h3v-6h2v6h3l-4 4-4-4z"/>
                <circle cx="4" cy="12" r="2"/>
                <circle cx="20" cy="12" r="2"/>
                <circle cx="12" cy="4" r="1"/>
                <circle cx="12" cy="20" r="1"/>
                    </svg>
              <h3 className="font-faith text-2xl font-bold text-black">Decentralized</h3>
            </div>
            <p className="text-black text-base leading-relaxed">Community-powered insurance system.</p>
          </div>
          <div className="flex-1 bg-white bg-opacity-40 backdrop-blur-md rounded-2xl p-10 border-2 border-black shadow-2xl shadow-white/50 text-left hover:bg-white hover:bg-opacity-60 transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 cursor-pointer" style={{filter: 'drop-shadow(0 0 25px rgba(255,255,255,0.4))'}}>
            <div className="flex items-center mb-4">
              <svg className="w-8 h-8 mr-4 text-black" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                    </svg>
              <h3 className="font-faith text-2xl font-bold text-black">Transparent</h3>
            </div>
            <p className="text-black text-base leading-relaxed">On-chain data and staking pools visible to all.</p>
          </div>
          <div className="flex-1 bg-white bg-opacity-40 backdrop-blur-md rounded-2xl p-10 border-2 border-black shadow-2xl shadow-white/50 text-left hover:bg-white hover:bg-opacity-60 transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 cursor-pointer" style={{filter: 'drop-shadow(0 0 25px rgba(255,255,255,0.4))'}}>
            <div className="flex items-center mb-4">
              <svg className="w-8 h-8 mr-4 text-black" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1"/>
                <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="1"/>
                    </svg>
              <h3 className="font-faith text-2xl font-bold text-black">Prediction-Based</h3>
            </div>
            <p className="text-black text-base leading-relaxed">Risk evaluated by collective market sentiment.</p>
          </div>
        </div>

        {/* How It Works - Match features width */}
        <div className="w-full max-w-6xl bg-white bg-opacity-50 rounded-2xl p-12 border-2 border-black shadow-2xl shadow-white/50 mb-16 mx-8" style={{filter: 'drop-shadow(0 0 30px rgba(255,255,255,0.5))'}}>
          <h2 className="font-faith text-4xl font-bold text-black mb-4">how it works</h2>
          <hr className="border-gray-300 mb-8" />
          
          {/* Simple explanation for everyone */}
          <div className="mb-8">
            <p className="text-black text-lg mb-6 leading-relaxed">
              <span className="font-semibold">protect.it turns DeFi insurance into a prediction market.</span> Instead of traditional insurance companies deciding coverage and pricing, the community does it through smart contracts.
            </p>
            <p className="text-black text-lg mb-6 leading-relaxed">
              Here's how it works: You can either <span className="font-semibold text-[#00FA9A]">buy insurance</span> against a protocol getting hacked, or <span className="font-semibold text-red-600">bet that it won't</span> get hacked. If you're right, you get paid. If you're wrong, you lose your stake.
            </p>
            <p className="text-black text-lg mb-6 leading-relaxed">
              The magic happens when thousands of people participate - their collective wisdom creates accurate pricing for risk. No insurance company needed. No paperwork. Just transparent, community-driven protection that pays out automatically when hacks happen.
            </p>
          </div>

          {/* Technical explanation for nerds */}
          <div className="border-t border-gray-300 pt-8">
            <h3 className="text-xl font-semibold text-black mb-4">For the Technical Minds</h3>
            <p className="text-black text-base mb-4 leading-relaxed">
              <span className="font-semibold">Protocol Architecture:</span> Each insurance market is a dual-token prediction market deployed as an ERC-20 pair (YES/NO tokens) with an automated market maker (AMM) for price discovery. Users mint position tokens by depositing USDC, with token prices reflecting real-time probability assessments of exploit events.
            </p>
            <p className="text-black text-base mb-4 leading-relaxed">
              <span className="font-semibold">Oracle Integration:</span> Hack confirmations are handled through a decentralized oracle system that monitors protocol treasuries, governance announcements, and verified exploit reports. Upon consensus, markets resolve automatically with proportional USDC payouts to winning token holders.
            </p>
            <p className="text-black text-base leading-relaxed">
              <span className="font-semibold">Economic Model:</span> The system leverages prediction market efficiency to price tail risks more accurately than traditional actuarial models. Market participants are incentivized to research and price risk correctly, creating a self-regulating insurance ecosystem with no central authority or underwriting requirements.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 w-full text-center py-6 text-black text-sm bg-white bg-opacity-60 backdrop-blur-sm border-t border-white/30" style={{filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.3))'}}>
        <span className="italic">Build by </span>
        <a href="https://x.com/neversellyreth" target="_blank" rel="noopener noreferrer" className="font-faith hover:text-[#00FA9A] transition-colors">Elyes Ben Abid</a>
        <span className="italic"> & </span>
        <a href="https://x.com/dani_krzv" target="_blank" rel="noopener noreferrer" className="font-faith hover:text-[#00FA9A] transition-colors">Daniil Kerzunov</a>
      </footer>
    </div>
  );
}
