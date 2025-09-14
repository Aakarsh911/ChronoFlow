import React from "react";
import Image from "next/image";
import { Bell, Settings, Clock } from "lucide-react";

export function Navbar({ userImage }: { userImage?: string }) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-8 py-4 bg-white border-b h-16 font-inter">
      <div className="flex items-center gap-3">
        <div className="bg-teal-600 rounded-lg p-2">
          <Clock size={20} color="white" />
        </div>
        <span className="text-lg font-semibold text-teal-700">ChronoFlow AI</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative">
          <Bell size={20} className="text-gray-600" />
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-xs text-white font-bold">4</span>
          </div>
        </div>
        <button className="p-1 rounded-full hover:bg-gray-100">
          <Settings size={20} className="text-gray-600" />
        </button>
        {userImage ? (
          <Image
            src={userImage}
            alt="User"
            width={40}
            height={40}
            className="rounded-full border-2 border-teal-400"
          />
        ) : (
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-teal-400 to-blue-500 text-white font-bold border-2 border-teal-400">
            <span>U</span>
          </div>
        )}
      </div>
    </nav>
  );
}
