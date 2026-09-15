"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { databases, DATABASE_ID, COLLECTIONS } from "../lib/appwrite";
import { Query } from "appwrite";
import { ShoppingCart, Users, Package, TrendingDown, ArrowRight, Loader2, CalendarDays, Truck, Moon, Sun } from "lucide-react";

interface Gasto {
  $id: string;
  total: number;
  fecha: string;
  $createdAt: string;
}

interface Sueldo {
  $id: string;
  total_pagar: number;
  fecha: string;
  $createdAt: string;
}

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
// Generamos años desde 2024 hasta 2030 para tener buen margen de historial
const ANIOS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

export default function DashboardPage() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [sueldos, setSueldos] = useState<Sueldo[]>([]);
  const [cargando, setCargando] = useState(true);

  // Estados de Filtro
  const [mesFiltro, setMesFiltro] = useState(new Date().getMonth());
  const [anioFiltro, setAnioFiltro] = useState(new Date().getFullYear());

  // Estado del Modo Oscuro
  const [modoOscuro, setModoOscuro] = useState(false);

  useEffect(() => {
    // Al cargar, nos fijamos si el usuario ya tenía el modo oscuro activado antes
    const temaGuardado = localStorage.getItem("brumi_tema");
    if (temaGuardado === "oscuro") {
      setModoOscuro(true);
    }
    cargarDatosGenerales();
  }, []);

  const toggleModoOscuro = () => {
    const nuevoEstado = !modoOscuro;
    setModoOscuro(nuevoEstado);
    localStorage.setItem("brumi_tema", nuevoEstado ? "oscuro" : "claro");
  };

  const cargarDatosGenerales = async () => {
    try {
      setCargando(true);
      const resGastos = await databases.listDocuments(DATABASE_ID, COLLECTIONS.GASTOS, [
        Query.orderDesc("$createdAt"),
        Query.limit(500)
      ]);
      const resSueldos = await databases.listDocuments(DATABASE_ID, "sueldos", [
        Query.orderDesc("$createdAt"),
        Query.limit(500)
      ]);

      setGastos(resGastos.documents as unknown as Gasto[]);
      setSueldos(resSueldos.documents as unknown as Sueldo[]);
    } catch (error) {
      console.error("Error al cargar métricas:", error);
    } finally {
      setCargando(false);
    }
  };

  // Filtramos según el mes y año seleccionados en los dropdowns
  const gastosFiltrados = gastos.filter((g) => {
    const fecha = new Date(g.fecha || g.$createdAt);
    return fecha.getMonth() === mesFiltro && fecha.getFullYear() === anioFiltro;
  });

  const sueldosFiltrados = sueldos.filter((s) => {
    const fecha = new Date(s.fecha || s.$createdAt);
    return fecha.getMonth() === mesFiltro && fecha.getFullYear() === anioFiltro;
  });

  const totalGastosMes = gastosFiltrados.reduce((acc, g) => acc + g.total, 0);
  const totalSueldosMes = sueldosFiltrados.reduce((acc, s) => acc + s.total_pagar, 0);
  const totalEgresosMes = totalGastosMes + totalSueldosMes;

  return (
    <div className={`min-h-screen p-6 md:p-10 font-sans transition-colors duration-300 ${modoOscuro ? "bg-gray-950 text-gray-100" : "bg-gray-50 text-gray-800"}`}>
      <div className="max-w-7xl mx-auto">
        
        {/* Cabecera del Dashboard */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className={`text-3xl font-extrabold tracking-tight ${modoOscuro ? "text-white" : "text-gray-900"}`}>
              Kiosco BruMi
            </h1>
            <p className={`font-medium mt-1 ${modoOscuro ? "text-gray-400" : "text-gray-500"}`}>
              Panel de Control y Gestión Interna
            </p>
          </div>
          
          {/* BOTONERA DERECHA: Filtros y Configuración */}
          <div className="flex items-center gap-3">
            
            {/* SELECTORES DE MES Y AÑO (Reemplaza al input anterior) */}
            <div className={`px-4 py-2.5 rounded-xl border shadow-sm flex items-center gap-2 transition-colors ${modoOscuro ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
              <CalendarDays size={18} className="text-blue-500" />
              
              <select
                value={mesFiltro}
                onChange={(e) => setMesFiltro(Number(e.target.value))}
                className={`bg-transparent text-sm font-bold outline-none cursor-pointer ${modoOscuro ? "text-gray-200" : "text-gray-700"}`}
              >
                {MESES.map((mes, index) => (
                  <option key={index} value={index} className="text-gray-900">{mes}</option>
                ))}
              </select>

              <span className={modoOscuro ? "text-gray-600" : "text-gray-300"}>/</span>

              <select
                value={anioFiltro}
                onChange={(e) => setAnioFiltro(Number(e.target.value))}
                className={`bg-transparent text-sm font-bold outline-none cursor-pointer ${modoOscuro ? "text-gray-200" : "text-gray-700"}`}
              >
                {ANIOS.map((anio) => (
                  <option key={anio} value={anio} className="text-gray-900">{anio}</option>
                ))}
              </select>
            </div>

            {/* BOTÓN MODO OSCURO */}
            <button
              onClick={toggleModoOscuro}
              className={`p-2.5 rounded-xl border shadow-sm flex items-center justify-center transition-all ${
                modoOscuro 
                  ? "bg-gray-800 border-gray-700 text-yellow-400 hover:bg-gray-700" 
                  : "bg-white border-gray-200 text-gray-600 hover:bg-gray-100"
              }`}
              title="Alternar Modo Oscuro/Claro"
            >
              {modoOscuro ? <Sun size={20} /> : <Moon size={20} />}
            </button>

          </div>
        </div>

        {/* --- MÉTRICAS DEL MES --- */}
        {cargando ? (
          <div className="flex justify-center py-20 text-gray-400">
            <Loader2 size={40} className="animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            
            {/* Tarjeta Gastos Proveedores */}
            <div className={`rounded-2xl p-6 border shadow-sm relative overflow-hidden group transition-colors ${modoOscuro ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"}`}>
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <ShoppingCart size={80} className="text-blue-600" />
              </div>
              <div className="relative z-10">
                <p className={`text-sm font-bold uppercase tracking-wider mb-2 ${modoOscuro ? "text-gray-400" : "text-gray-500"}`}>Pedidos a Proveedores</p>
                <p className={`text-4xl font-extrabold ${modoOscuro ? "text-white" : "text-gray-900"}`}>${totalGastosMes.toLocaleString("es-AR")}</p>
                <p className={`text-xs font-medium mt-2 ${modoOscuro ? "text-gray-500" : "text-gray-400"}`}>{gastosFiltrados.length} pedidos registrados</p>
              </div>
            </div>

            {/* Tarjeta Sueldos */}
            <div className={`rounded-2xl p-6 border shadow-sm relative overflow-hidden group transition-colors ${modoOscuro ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"}`}>
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Users size={80} className="text-orange-600" />
              </div>
              <div className="relative z-10">
                <p className={`text-sm font-bold uppercase tracking-wider mb-2 ${modoOscuro ? "text-gray-400" : "text-gray-500"}`}>Liquidación de Sueldos</p>
                <p className={`text-4xl font-extrabold ${modoOscuro ? "text-white" : "text-gray-900"}`}>${totalSueldosMes.toLocaleString("es-AR")}</p>
                <p className={`text-xs font-medium mt-2 ${modoOscuro ? "text-gray-500" : "text-gray-400"}`}>{sueldosFiltrados.length} pagos registrados</p>
              </div>
            </div>

            {/* Tarjeta Total Egresos */}
            <div className={`rounded-2xl p-6 border shadow-md relative overflow-hidden group transition-colors ${modoOscuro ? "bg-black border-gray-800" : "bg-gray-900 border-gray-800"}`}>
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <TrendingDown size={80} className="text-red-400" />
              </div>
              <div className="relative z-10">
                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Total Egresos Operativos</p>
                <p className="text-4xl font-extrabold text-white">${totalEgresosMes.toLocaleString("es-AR")}</p>
                <p className="text-xs text-gray-400 mt-2 font-medium">Suma de mercadería + personal</p>
              </div>
            </div>

          </div>
        )}

        {/* --- ACCESOS RÁPIDOS A LOS MÓDULOS --- */}
        <h2 className={`text-xl font-bold mb-6 ${modoOscuro ? "text-white" : "text-gray-800"}`}>
          Módulos del Sistema
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <Link href="/pedidos" className="group">
            <div className={`rounded-2xl p-6 border hover:border-blue-500 hover:shadow-lg transition-all h-full flex flex-col ${modoOscuro ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
              <div className="bg-blue-500/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ShoppingCart size={28} className="text-blue-500" />
              </div>
              <h3 className={`text-lg font-bold mb-2 ${modoOscuro ? "text-white" : "text-gray-900"}`}>Compras y Pedidos</h3>
              <p className={`text-sm flex-1 ${modoOscuro ? "text-gray-400" : "text-gray-500"}`}>Armá carritos de mercadería, envialos por WhatsApp al proveedor y guardá el historial.</p>
              <div className="mt-6 flex items-center text-blue-500 font-semibold text-sm">
                Ir al módulo <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          <Link href="/proveedores" className="group">
            <div className={`rounded-2xl p-6 border hover:border-purple-500 hover:shadow-lg transition-all h-full flex flex-col ${modoOscuro ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
              <div className="bg-purple-500/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Truck size={28} className="text-purple-500" />
              </div>
              <h3 className={`text-lg font-bold mb-2 ${modoOscuro ? "text-white" : "text-gray-900"}`}>Proveedores</h3>
              <p className={`text-sm flex-1 ${modoOscuro ? "text-gray-400" : "text-gray-500"}`}>Gestioná tu base de datos de empresas, teléfonos y contactos para los pedidos.</p>
              <div className="mt-6 flex items-center text-purple-500 font-semibold text-sm">
                Ir al módulo <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          <Link href="/productos" className="group">
            <div className={`rounded-2xl p-6 border hover:border-green-500 hover:shadow-lg transition-all h-full flex flex-col ${modoOscuro ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
              <div className="bg-green-500/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Package size={28} className="text-green-500" />
              </div>
              <h3 className={`text-lg font-bold mb-2 ${modoOscuro ? "text-white" : "text-gray-900"}`}>Catálogo de Productos</h3>
              <p className={`text-sm flex-1 ${modoOscuro ? "text-gray-400" : "text-gray-500"}`}>Administrá tu lista de artículos por proveedor, precios de costo y medidas.</p>
              <div className="mt-6 flex items-center text-green-500 font-semibold text-sm">
                Ir al módulo <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          <Link href="/turnos" className="group">
            <div className={`rounded-2xl p-6 border hover:border-orange-500 hover:shadow-lg transition-all h-full flex flex-col ${modoOscuro ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
              <div className="bg-orange-500/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users size={28} className="text-orange-500" />
              </div>
              <h3 className={`text-lg font-bold mb-2 ${modoOscuro ? "text-white" : "text-gray-900"}`}>Personal y Sueldos</h3>
              <p className={`text-sm flex-1 ${modoOscuro ? "text-gray-400" : "text-gray-500"}`}>Gestioná la grilla de francos, cargá horas trabajadas y liquida pagos diarios.</p>
              <div className="mt-6 flex items-center text-orange-500 font-semibold text-sm">
                Ir al módulo <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

        </div>

      </div>
    </div>
  );
}