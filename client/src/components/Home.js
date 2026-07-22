import {
  Users,
  ClipboardCheck,
  History,
  ShieldCheck,
  BarChart3,
  ArrowRight,
  Laptop,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import './Home.css';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100">

      {/* Navbar */}
      <nav className="w-full bg-white/80 backdrop-blur-sm border-b border-gray-100 px-8 py-4 flex items-center justify-between sticky top-0 z-50 rounded-b-3xl">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 text-white w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold">
            A
          </div>
          <span className="text-xl font-bold text-gray-800">Smart Attendance</span>
        </div>
        <button
          onClick={() => navigate('/login')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-semibold transition"
        >
          Login
        </button>
      </nav>

      {/* Hero Section */}
      <section className="w-full px-8 py-12 flex flex-col lg:flex-row items-center justify-between gap-12">

        {/* Left */}
        <div className="flex-1">
          <span className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-semibold">
            Smart Attendance System
          </span>

          <h1 className="text-6xl font-extrabold mt-6 leading-tight">
            Smart <br />
            <span className="text-blue-600">
              Attendance Tracking
            </span>
          </h1>

          <p className="mt-6 text-gray-600 text-lg max-w-xl">
            Mark attendance seamlessly using Team IDs and System IDs.
            Fast, secure, and designed for Smart India Hackathon teams.
          </p>

          <button 
            onClick={() => navigate('/login')}
            className="mt-8 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl flex items-center gap-3 shadow-lg transition"
          >
            <ClipboardCheck size={22} />
            Take Attendance
          </button>
        </div>

        {/* Right */}
        <div className="flex-1 flex justify-center">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-[450px]">

            <h2 className="font-bold text-xl mb-6">
              Attendance Overview
            </h2>

            <div className="grid grid-cols-2 gap-5">

              <div className="bg-blue-50 rounded-xl p-5">
                <p className="text-gray-500">Total Students</p>
                <h3 className="text-3xl font-bold mt-2">128</h3>
              </div>

              <div className="bg-green-50 rounded-xl p-5">
                <p className="text-gray-500">Present Today</p>
                <h3 className="text-3xl font-bold text-green-600 mt-2">
                  114
                </h3>
              </div>

              <div className="bg-red-50 rounded-xl p-5">
                <p className="text-gray-500">Absent</p>
                <h3 className="text-3xl font-bold text-red-500 mt-2">
                  14
                </h3>
              </div>

              <div className="bg-indigo-50 rounded-xl p-5">
                <p className="text-gray-500">Attendance</p>
                <h3 className="text-3xl font-bold text-indigo-600 mt-2">
                  89%
                </h3>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}

      <section className="w-full px-8 pb-10">

        <h2 className="text-3xl font-bold mb-8">
          Quick Actions
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">

          <Card
            icon={<ClipboardCheck size={35} />}
            title="Take Attendance"
            desc="Start attendance using Team ID & System ID."
            onClick={() => navigate('/login')}
          />

          <Card
            icon={<Users size={35} />}
            title="Manage Teams"
            desc="View and update registered teams."
            onClick={() => navigate('/login')}
          />

          <Card
            icon={<History size={35} />}
            title="Attendance History"
            desc="Check previous attendance records."
            onClick={() => navigate('/login')}
          />

          <Card
            icon={<BarChart3 size={35} />}
            title="Reports"
            desc="Generate attendance reports instantly."
            onClick={() => navigate('/login')}
          />

        </div>
      </section>

      {/* Features */}

      <section className="w-full px-8 pb-16">

        <div className="bg-white rounded-3xl shadow-lg grid md:grid-cols-3 gap-8 p-10">

          <Feature
            icon={<Laptop size={35} />}
            title="Easy Tracking"
            text="Attendance with Team ID & System ID."
          />

          <Feature
            icon={<ShieldCheck size={35} />}
            title="Secure"
            text="Safe data with role-based access."
          />

          <Feature
            icon={<BarChart3 size={35} />}
            title="Analytics"
            text="Daily attendance insights & reports."
          />

        </div>

      </section>

      {/* Footer */}
      <footer className="w-full bg-white border-t border-gray-100 py-6 px-8 text-center">
        <p className="text-gray-500 text-sm">
          Made with ❤️ by{' '}
          <a
            href="https://github.com/phoenixdev100"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline font-medium"
          >
            Deepak
          </a>
        </p>
      </footer>

    </div>
  );
}

function Card({ icon, title, desc, onClick }) {
  return (
    <div onClick={onClick} className="bg-white rounded-2xl shadow-md p-8 hover:shadow-xl hover:-translate-y-2 transition cursor-pointer">
      <div className="text-blue-600 mb-4">{icon}</div>

      <h3 className="font-bold text-xl">{title}</h3>

      <p className="text-gray-500 mt-3">
        {desc}
      </p>

      <button className="mt-6 flex items-center gap-2 text-blue-600 font-semibold">
        Open
        <ArrowRight size={18} />
      </button>
    </div>
  );
}

function Feature({ icon, title, text }) {
  return (
    <div className="flex gap-5 items-start">
      <div className="bg-blue-100 p-4 rounded-xl text-blue-600">
        {icon}
      </div>

      <div>
        <h3 className="font-bold text-lg">{title}</h3>
        <p className="text-gray-500 mt-2">{text}</p>
      </div>
    </div>
  );
}
