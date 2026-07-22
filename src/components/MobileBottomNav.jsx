import React from "react";
import { useNavigate } from "react-router-dom";
import { BookMarked, CalendarDays, CalendarRange, MessageCircle } from "lucide-react";

export default function MobileBottomNav({
  vistaPrincipal = "malla",
  setVistaPrincipal,
}) {
  const navigate = useNavigate();

  const navItems = [
    {
      label: "Mi malla",
      value: "malla",
      icon: <BookMarked className="w-5.5 h-5.5" />,
      onClick: () => {
        setVistaPrincipal("malla");
        navigate("/app");
      }
    },
    {
      label: "Periodo actual",
      value: "periodo-actual",
      icon: <CalendarDays className="w-5.5 h-5.5" />,
      onClick: () => {
        setVistaPrincipal("periodo-actual");
        navigate("/app");
      }
    },
    {
      label: "Toma de Ramos",
      value: "toma-de-ramos",
      icon: <CalendarRange className="w-5.5 h-5.5" />,
      onClick: () => {
        setVistaPrincipal("toma-de-ramos");
        navigate("/programacion-academica");
      }
    },
    {
      label: "Tutorías",
      value: "tutorias",
      icon: <MessageCircle className="w-5.5 h-5.5" />,
      onClick: () => {
        setVistaPrincipal("tutorias");
        navigate("/app");
      }
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[calc(4rem+env(safe-area-inset-bottom,0px))] bg-bgSecondary/90 backdrop-blur-xl border-t border-borderColor/50 z-[90] sm:hidden grid grid-cols-4 items-center px-1 pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
      {navItems.map((item) => {
        const isActive = vistaPrincipal === item.value;
        return (
          <button
            key={item.value}
            onClick={item.onClick}
            className={`flex flex-col items-center justify-center p-1 transition-all duration-200 gap-1
              ${isActive ? "text-primary font-bold scale-105" : "text-textSecondary"}`}
          >
            <div className={`transition-transform duration-200 ${isActive ? "scale-105 text-primary" : "text-textSecondary/80"}`}>
              {item.icon}
            </div>
            <span className="text-[9.5px] font-semibold leading-none truncate w-full text-center">
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
