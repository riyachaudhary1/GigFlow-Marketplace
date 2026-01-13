import { useState, useEffect } from 'react';
import axios from 'axios';

// Settings
axios.defaults.withCredentials = true;
const API = "http://localhost:5000/api";

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('login'); 

  // Check if we are logged in on refresh (optional, but good)
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
        setUser(JSON.parse(savedUser));
        setView('feed');
    }
  }, []);

  const handleLoginSuccess = (userData) => {
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      setView('feed');
  };

  const handleLogout = () => {
      setUser(null);
      localStorage.removeItem('user');
      setView('login');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-5 font-sans text-gray-800">
      {/* Navbar */}
      <nav className="flex justify-between items-center bg-white p-4 shadow mb-6 rounded-lg">
        <h1 className="text-2xl font-bold text-blue-600 tracking-tight">GigFlow</h1>
        {user && (
          <div className="flex gap-4 items-center">
            <button onClick={() => setView('feed')} className="hover:text-blue-600 font-medium">Find Work</button>
            <button onClick={() => setView('post')} className="hover:text-blue-600 font-medium">Post Job</button>
            <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full">Hi, {user.name}</span>
            <button onClick={handleLogout} className="text-red-500 text-sm hover:underline">Logout</button>
          </div>
        )}
      </nav>

      {/* Main Content Area */}
      <div className="max-w-4xl mx-auto">
        {view === 'login' && <Login onLogin={handleLoginSuccess} />}
        {view === 'feed' && <Feed user={user} onViewGig={(gig) => setView({ name: 'details', gig })} />}
        {view === 'post' && <PostGig onSuccess={() => setView('feed')} />}
        {view.name === 'details' && <GigDetails user={user} gig={view.gig} onBack={() => setView('feed')} />}
      </div>
    </div>
  );
}

// --- 1. LOGIN COMPONENT ---
function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleAuth = async (endpoint) => {
    if (!email || !password) return alert("Please fill in fields");
    try {
      // Use email prefix as name for simplicity
      const name = email.split('@')[0];
      const { data } = await axios.post(`${API}/auth/${endpoint}`, { name, email, password });
      onLogin(data); 
    } catch (e) { 
      alert("Action failed. If logging in, check password. If registering, email might be taken."); 
    }
  };

  return (
    <div className="max-w-sm mx-auto bg-white p-8 rounded-xl shadow-lg mt-10">
      <h2 className="text-2xl mb-6 font-bold text-center text-gray-700">Welcome</h2>
      <input className="border p-3 w-full mb-3 rounded focus:outline-none focus:ring-2 focus:ring-blue-400" placeholder="Email" onChange={e => setEmail(e.target.value)} />
      <input className="border p-3 w-full mb-6 rounded focus:outline-none focus:ring-2 focus:ring-blue-400" type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} />
      <div className="flex flex-col gap-3">
        <button onClick={() => handleAuth('login')} className="bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-semibold transition">Login</button>
        <button onClick={() => handleAuth('register')} className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded font-semibold transition">Create Account</button>
      </div>
    </div>
  );
}

// --- 2. FEED COMPONENT ---
function Feed({ onViewGig }) {
  const [gigs, setGigs] = useState([]);
  useEffect(() => { 
      axios.get(`${API}/gigs`)
        .then(res => setGigs(res.data))
        .catch(err => console.error(err));
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Available Gigs</h2>
      {gigs.length === 0 && <p className="text-gray-500">No gigs available right now.</p>}
      <div className="grid gap-4">
        {gigs.map(gig => (
          <div key={gig._id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-bold text-xl text-gray-800">{gig.title}</h3>
                    <p className="text-green-600 font-bold mt-1">${gig.budget}</p>
                </div>
                <button onClick={() => onViewGig(gig)} className="bg-blue-50 text-blue-600 px-4 py-2 rounded font-medium hover:bg-blue-100">View</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- 3. POST GIG COMPONENT ---
function PostGig({ onSuccess }) {
  const [form, setForm] = useState({ title: '', description: '', budget: '' });
  
  const submit = async () => {
    if(!form.title || !form.budget) return alert("Please fill required fields");
    await axios.post(`${API}/gigs`, form);
    alert("Gig Posted!");
    onSuccess();
  };

  return (
    <div className="max-w-lg mx-auto bg-white p-8 rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-6">Post a New Job</h2>
      <div className="space-y-4">
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
            <input className="border p-3 w-full rounded focus:ring-2 focus:ring-blue-400 outline-none" placeholder="e.g. Build a React Website" onChange={e => setForm({...form, title: e.target.value})} />
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="border p-3 w-full rounded focus:ring-2 focus:ring-blue-400 outline-none h-32" placeholder="Details about the work..." onChange={e => setForm({...form, description: e.target.value})} />
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Budget ($)</label>
            <input className="border p-3 w-full rounded focus:ring-2 focus:ring-blue-400 outline-none" type="number" placeholder="500" onChange={e => setForm({...form, budget: e.target.value})} />
        </div>
        <button onClick={submit} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded font-bold transition">Post Job</button>
      </div>
    </div>
  );
}

// --- 4. GIG DETAILS & HIRING ---
function GigDetails({ gig, user, onBack }) {
  const [bids, setBids] = useState([]);
  const [msg, setMsg] = useState('');
  
  // Fetch bids if owner
  useEffect(() => {
    if (user.id === gig.ownerId) {
      axios.get(`${API}/bids/${gig._id}`).then(res => setBids(res.data));
    }
  }, [gig, user]);

  const placeBid = async () => {
    if(!msg) return alert("Please write a message");
    await axios.post(`${API}/bids`, { gigId: gig._id, message: msg });
    alert("Bid Sent Successfully!"); 
    onBack();
  };

  const hire = async (bidId) => {
    if(!window.confirm("Are you sure you want to hire this freelancer?")) return;
    await axios.put(`${API}/bids/hire/${bidId}`);
    alert("Freelancer Hired! Project status updated.");
    onBack();
  };

  const isOwner = user.id === gig.ownerId;

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg">
      <button onClick={onBack} className="mb-6 text-gray-500 hover:text-gray-800 font-medium">← Back to Feed</button>
      
      <div className="border-b pb-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">{gig.title}</h1>
          <p className="text-gray-600 text-lg mb-4">{gig.description}</p>
          <div className="flex gap-4">
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-bold">Budget: ${gig.budget}</span>
            <span className={`px-3 py-1 rounded-full font-bold ${gig.status === 'Open' ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-600'}`}>Status: {gig.status}</span>
          </div>
      </div>

      {/* FREELANCER VIEW: Place Bid */}
      {!isOwner && gig.status === 'Open' && (
        <div className="bg-blue-50 p-6 rounded-lg">
          <h3 className="font-bold text-lg mb-3">Apply for this Job</h3>
          <textarea className="border w-full p-3 rounded mb-3 focus:outline-blue-400" placeholder="Why are you a good fit?" onChange={e => setMsg(e.target.value)} />
          <button onClick={placeBid} className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700">Submit Proposal</button>
        </div>
      )}

      {/* CLIENT VIEW: Manage Bids */}
      {isOwner && (
        <div>
          <h3 className="font-bold text-xl mb-4">Applicants</h3>
          {bids.length === 0 ? <p className="text-gray-500 italic">No bids yet.</p> : (
            <div className="space-y-3">
                {bids.map(bid => (
                    <div key={bid._id} className="flex justify-between items-center border p-4 rounded-lg bg-gray-50">
                    <div>
                        <p className="font-bold text-gray-800">{bid.email}</p>
                        <p className="text-gray-600">{bid.message}</p>
                        <div className="mt-1">
                            {bid.status === 'Hired' && <span className="text-green-600 font-bold uppercase text-sm">● Hired</span>}
                            {bid.status === 'Rejected' && <span className="text-red-400 font-bold uppercase text-sm">● Rejected</span>}
                            {bid.status === 'Pending' && <span className="text-yellow-600 font-bold uppercase text-sm">● Pending</span>}
                        </div>
                    </div>
                    {gig.status === 'Open' && bid.status === 'Pending' && (
                        <button onClick={() => hire(bid._id)} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded font-bold shadow-sm">Hire</button>
                    )}
                    </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;