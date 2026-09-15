    "use client";

    import { useState, useEffect } from "react";
    import { databases, DATABASE_ID, COLLECTIONS } from "../../lib/appwrite";
    import { ID, Query } from "appwrite";
    import { ArrowLeft, Loader2, DollarSign, Calendar, CheckCircle, UserCheck, Trash2, FileText, Plus, Edit2, Check, X, Clock, EyeOff, Eye, Moon, Sun, Info } from "lucide-react";
    import Link from "next/link";

    interface RegistroSueldo {
    $id: string;
    empleado: string;
    horas_trabajadas: number;
    descontar: number;
    sueldo_por_hora: number;
    total_pagar: number;
    estado: string;
    fecha: string;
    $createdAt: string;
    }

    interface EmpleadoPlanilla {
    id: string;
    nombre: string;
    horas: number | "";
    descuento: number | "";
    sueldoHora: number | "";
    pagado: boolean;
    }

    const HORARIOS_INICIALES = [
    { trabajador: "SOLEDAD", lunes: "17 a 1", martes: "17 a 1", miercoles: "Franco", jueves: "Franco", viernes: "17 a 1", sabado: "2 a 9", domingo: "19 a 1", visible: true },
    { trabajador: "MICAELA", lunes: "7 a 11", martes: "7 a 11", miercoles: "Franco", jueves: "7 a 11", viernes: "7 a 11", sabado: "franco", domingo: "franco", visible: true },
    { trabajador: "BRUNO", lunes: "11 a 17", martes: "11 a 17", miercoles: "7 a 13", jueves: "11 a 17", viernes: "11 a 17", sabado: "9 a 13", domingo: "franco", visible: true },
    { trabajador: "NAPO", lunes: "franco", martes: "franco", miercoles: "13 a 19", jueves: "Franco", viernes: "Franco", sabado: "13 a 19", domingo: "9 a 13", visible: true },
    { trabajador: "BELEN", lunes: "franco", martes: "Franco", miercoles: "19 a 1", jueves: "17 a 1", viernes: "1 a 9", sabado: "19 a 2", domingo: "13 a 19", visible: true },
    ];

    export default function TurnosYSuelsosPage() {
    const [modoOscuro, setModoOscuro] = useState(false);

    const [horarios, setHorarios] = useState(HORARIOS_INICIALES);
    const [diasVisibles, setDiasVisibles] = useState({
        lunes: true, martes: true, miercoles: true, jueves: true, viernes: true, sabado: true, domingo: true
    });

    const [planilla, setPlanilla] = useState<EmpleadoPlanilla[]>([
        { id: "1", nombre: "Napo", horas: "", descuento: "", sueldoHora: 3000, pagado: true },
        { id: "2", nombre: "Soledad", horas: "", descuento: "", sueldoHora: 3000, pagado: true },
        { id: "3", nombre: "Belen", horas: "", descuento: "", sueldoHora: 3000, pagado: true },
        { id: "4", nombre: "Micaela", horas: "", descuento: "", sueldoHora: 3000, pagado: true },
    ]);

    const [nuevoNombre, setNuevoNombre] = useState("");
    const [nuevoSueldoBase, setNuevoSueldoBase] = useState<number | "">(3000);
    const [mostrarFormNuevo, setMostrarFormNuevo] = useState(false);
    const [editandoId, setEditandoId] = useState<string | null>(null);
    const [nombreTemporal, setNombreTemporal] = useState("");

    const [guardando, setGuardando] = useState(false);
    const [mensajeExito, setMensajeExito] = useState("");

    const [historial, setHistorial] = useState<RegistroSueldo[]>([]);
    const [cargandoHistorial, setCargandoHistorial] = useState(false);
    const [filtroFecha, setFiltroFecha] = useState<string>("hoy");
    const [fechaExacta, setFechaExacta] = useState<string>("");

    // ESTADO PARA ALERTAS Y CONFIRMACIONES PROPIAS
    const [alerta, setAlerta] = useState({ abierto: false, mensaje: "", tipo: "info", accionConfirmar: null as any });

    const mostrarAlerta = (mensaje: string) => {
        setAlerta({ abierto: true, mensaje, tipo: "info", accionConfirmar: null });
    };

    const mostrarConfirmacion = (mensaje: string, accion: () => void) => {
        setAlerta({ abierto: true, mensaje, tipo: "confirmacion", accionConfirmar: accion });
    };

    useEffect(() => {
        const temaGuardado = localStorage.getItem("brumi_tema");
        if (temaGuardado === "oscuro") setModoOscuro(true);

        cargarHistorial();
        const horariosGuardados = localStorage.getItem("brumi_horarios");
        if (horariosGuardados) setHorarios(JSON.parse(horariosGuardados));
    }, []);

    const toggleModoOscuro = () => {
        const nuevo = !modoOscuro;
        setModoOscuro(nuevo);
        localStorage.setItem("brumi_tema", nuevo ? "oscuro" : "claro");
    };

    const actualizarHorario = (index: number, campo: string, valor: string | boolean) => {
        const nuevos = [...horarios];
        (nuevos[index] as any)[campo] = valor;
        setHorarios(nuevos);
        localStorage.setItem("brumi_horarios", JSON.stringify(nuevos));
    };

    const agregarFilaHorario = () => {
        const nuevos = [...horarios, { trabajador: "", lunes: "", martes: "", miercoles: "", jueves: "", viernes: "", sabado: "", domingo: "", visible: true }];
        setHorarios(nuevos);
        localStorage.setItem("brumi_horarios", JSON.stringify(nuevos));
    };

    const solicitarEliminarFilaHorario = (index: number) => {
        if (horarios.length <= 1) return mostrarAlerta("Debe quedar al menos un trabajador en el cronograma.");
        mostrarConfirmacion("¿Seguro que querés eliminar a este trabajador del cronograma?", () => {
        const nuevos = horarios.filter((_, i) => i !== index);
        setHorarios(nuevos);
        localStorage.setItem("brumi_horarios", JSON.stringify(nuevos));
        setAlerta({ abierto: false, mensaje: "", tipo: "info", accionConfirmar: null });
        });
    };

    const toggleVisibilidadFila = (index: number) => {
        const estadoActual = horarios[index].visible !== false;
        actualizarHorario(index, "visible", !estadoActual);
    };

    const toggleDiaVisible = (dia: keyof typeof diasVisibles) => {
        setDiasVisibles(prev => ({ ...prev, [dia]: !prev[dia] }));
    };

    const diasDeLaSemana = [
        { key: "lunes", label: "Lunes" }, { key: "martes", label: "Martes" },
        { key: "miercoles", label: "Miércoles" }, { key: "jueves", label: "Jueves" },
        { key: "viernes", label: "Viernes" }, { key: "sabado", label: "Sábado" }, { key: "domingo", label: "Domingo" },
    ];

    const cargarHistorial = async () => {
        try {
        setCargandoHistorial(true);
        const res = await databases.listDocuments(DATABASE_ID, "sueldos", [Query.orderDesc("$createdAt"), Query.limit(100)]);
        setHistorial(res.documents as unknown as RegistroSueldo[]);
        } catch (error) {
        console.error("Error al cargar historial:", error);
        } finally {
        setCargandoHistorial(false);
        }
    };

    const actualizarFilaSueldo = (id: string, campo: keyof EmpleadoPlanilla, valor: any) => {
        setPlanilla(prev => prev.map(emp => (emp.id === id ? { ...emp, [campo]: valor } : emp)));
    };

    const agregarEmpleado = (e: React.FormEvent) => {
        e.preventDefault();
        if (!nuevoNombre.trim()) return;
        const nuevo: EmpleadoPlanilla = { id: Date.now().toString(), nombre: nuevoNombre.trim(), horas: "", descuento: "", sueldoHora: Number(nuevoSueldoBase) || 3000, pagado: true };
        setPlanilla([...planilla, nuevo]);
        setNuevoNombre("");
        setMostrarFormNuevo(false);
    };

    const eliminarEmpleadoPlanilla = (id: string) => {
        if (planilla.length <= 1) return mostrarAlerta("Debe quedar al menos un empleado en la planilla.");
        setPlanilla(planilla.filter(emp => emp.id !== id));
    };

    const iniciarEdicionNombre = (emp: EmpleadoPlanilla) => {
        setEditandoId(emp.id);
        setNombreTemporal(emp.nombre);
    };

    const guardarEdicionNombre = (id: string) => {
        if (!nombreTemporal.trim()) return;
        setPlanilla(prev => prev.map(emp => (emp.id === id ? { ...emp, nombre: nombreTemporal.trim() } : emp)));
        setEditandoId(null);
    };

    const calcularTotalFila = (item: EmpleadoPlanilla) => {
        const horas = Number(item.horas) || 0;
        const descuento = Number(item.descuento) || 0;
        const valorHora = Number(item.sueldoHora) || 0;
        const subtotal = (horas * valorHora) - descuento;
        return subtotal > 0 ? subtotal : 0;
    };

    const totalDiaGlobal = planilla.reduce((acc, item) => acc + calcularTotalFila(item), 0);

    const registrarPagosDelDia = async () => {
        const aRegistrar = planilla.filter(item => Number(item.horas) > 0);
        if (aRegistrar.length === 0) return mostrarAlerta("Por favor, cargá horas al menos a un empleado antes de registrar.");

        try {
        setGuardando(true);
        const fechaHoy = new Date().toISOString();
        const promesas = aRegistrar.map(item => {
            return databases.createDocument(DATABASE_ID, "sueldos", ID.unique(), {
            empleado: item.nombre,
            horas_trabajadas: Number(item.horas), 
            descontar: Number(item.descuento) || 0, 
            sueldo_por_hora: Number(item.sueldoHora) || 0, 
            total_pagar: calcularTotalFila(item), 
            estado: item.pagado ? "pagado" : "pendiente", 
            fecha: fechaHoy,
            });
        });

        await Promise.all(promesas);
        setMensajeExito("¡Registros guardados con éxito!");
        await cargarHistorial();
        setPlanilla(prev => prev.map(emp => ({ ...emp, horas: "", descuento: "" })));
        setTimeout(() => setMensajeExito(""), 4000);
        } catch (error: any) {
        console.error("Error al registrar:", error);
        mostrarAlerta("Error al guardar: " + (error.message || error));
        } finally {
        setGuardando(false);
        }
    };

    const solicitarEliminarRegistroHistorial = (id: string) => {
        mostrarConfirmacion("¿Seguro que querés eliminar este registro del historial de sueldos?", async () => {
        try {
            await databases.deleteDocument(DATABASE_ID, "sueldos", id);
            setHistorial(prev => prev.filter(h => h.$id !== id));
        } catch (error) {
            console.error("Error al eliminar:", error);
        } finally {
            setAlerta({ abierto: false, mensaje: "", tipo: "info", accionConfirmar: null });
        }
        });
    };

    const historialFiltrado = historial.filter((h) => {
        const fechaReg = new Date(h.fecha || h.$createdAt);
        const hoy = new Date();
        if (filtroFecha === "hoy") return fechaReg.toDateString() === hoy.toDateString();
        else if (filtroFecha === "semana") {
        const hace7Dias = new Date(); hace7Dias.setDate(hoy.getDate() - 7); return fechaReg >= hace7Dias;
        } else if (filtroFecha === "mes") {
        return fechaReg.getMonth() === hoy.getMonth() && fechaReg.getFullYear() === hoy.getFullYear();
        } else if (filtroFecha === "exacta" && fechaExacta) {
        const strFechaReg = `${fechaReg.getFullYear()}-${String(fechaReg.getMonth() + 1).padStart(2, '0')}-${String(fechaReg.getDate()).padStart(2, '0')}`;
        return strFechaReg === fechaExacta;
        }
        return true;
    });

    return (
        <div className={`min-h-screen p-6 md:p-10 font-sans transition-colors duration-300 ${modoOscuro ? "bg-gray-950 text-gray-100" : "bg-gray-50 text-gray-800"}`}>
        
        {/* CUADRO DE DIÁLOGO PERSONALIZADO */}
        {alerta.abierto && (
            <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm transition-opacity">
            <div className={`rounded-2xl w-full max-w-sm p-6 shadow-2xl relative border text-center flex flex-col items-center animate-in zoom-in-95 duration-200 ${modoOscuro ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"}`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${alerta.tipo === "confirmacion" ? (modoOscuro ? "bg-red-900/30 text-red-400" : "bg-red-100 text-red-600") : (modoOscuro ? "bg-blue-900/30 text-blue-400" : "bg-blue-100 text-blue-600")}`}>
                <Info size={24} />
                </div>
                <h3 className={`text-lg font-bold mb-2 ${modoOscuro ? "text-white" : "text-gray-900"}`}>
                {alerta.tipo === "confirmacion" ? "Atención" : "Aviso del Sistema"}
                </h3>
                <p className={`mb-6 text-sm ${modoOscuro ? "text-gray-400" : "text-gray-500"}`}>
                {alerta.mensaje}
                </p>
                
                {alerta.tipo === "confirmacion" ? (
                <div className="flex gap-3 w-full">
                    <button
                    onClick={() => setAlerta({ abierto: false, mensaje: "", tipo: "info", accionConfirmar: null })}
                    className={`w-full font-bold py-3 px-4 rounded-xl transition ${modoOscuro ? "bg-gray-800 text-gray-300 hover:bg-gray-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                    >
                    Cancelar
                    </button>
                    <button
                    onClick={alerta.accionConfirmar}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-xl transition shadow-sm"
                    >
                    Sí, Eliminar
                    </button>
                </div>
                ) : (
                <button
                    onClick={() => setAlerta({ abierto: false, mensaje: "", tipo: "info", accionConfirmar: null })}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition shadow-sm"
                >
                    Aceptar
                </button>
                )}
            </div>
            </div>
        )}

        <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
                <Link href="/" className={`flex items-center gap-2 text-sm font-semibold transition mb-2 ${modoOscuro ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-800"}`}>
                <ArrowLeft size={18} /> Volver al Inicio
                </Link>
                <h1 className={`text-2xl font-bold ${modoOscuro ? "text-white" : "text-gray-900"}`}>Control de Turnos y Sueldos</h1>
            </div>
            
            <button
                onClick={toggleModoOscuro}
                className={`p-2.5 rounded-xl border shadow-sm flex items-center justify-center transition-all ${
                modoOscuro ? "bg-gray-800 border-gray-700 text-yellow-400 hover:bg-gray-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-100"
                }`}
            >
                {modoOscuro ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            </div>

            {mensajeExito && (
            <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 font-medium shadow-sm border ${modoOscuro ? "bg-green-900/30 border-green-800 text-green-400" : "bg-green-50 border-green-200 text-green-700"}`}>
                <CheckCircle size={20} /> {mensajeExito}
            </div>
            )}

            {/* --- MÓDULO 1: CRONOGRAMA SEMANAL --- */}
            <div className={`rounded-2xl p-6 shadow-sm border mb-8 ${modoOscuro ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"}`}>
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-4">
                <h2 className={`text-lg font-bold flex items-center gap-2 ${modoOscuro ? "text-white" : "text-gray-800"}`}>
                <Clock size={20} className="text-orange-500"/> Cronograma Semanal
                </h2>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <div className={`flex items-center flex-wrap gap-2 p-2 rounded-xl border ${modoOscuro ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-100"}`}>
                    <span className={`text-xs font-bold uppercase mr-2 flex items-center gap-1 ${modoOscuro ? "text-gray-500" : "text-gray-400"}`}>
                    <Eye size={14} /> Días:
                    </span>
                    {diasDeLaSemana.map((dia) => (
                    <button
                        key={dia.key}
                        onClick={() => toggleDiaVisible(dia.key as keyof typeof diasVisibles)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        diasVisibles[dia.key as keyof typeof diasVisibles]
                            ? modoOscuro ? "bg-orange-900/40 text-orange-400 border border-orange-800" : "bg-orange-100 text-orange-800 border border-orange-200"
                            : modoOscuro ? "bg-gray-800 text-gray-500 border border-gray-700 line-through opacity-70" : "bg-white text-gray-400 border border-gray-200 line-through opacity-70"
                        }`}
                    >
                        {dia.label}
                    </button>
                    ))}
                </div>
                </div>
            </div>
            
            <div className={`overflow-x-auto rounded-xl border ${modoOscuro ? "border-gray-800" : "border-orange-100"}`}>
                <table className="w-full text-center text-sm border-collapse">
                <thead>
                    <tr className={`uppercase text-xs font-bold ${modoOscuro ? "bg-gray-800/50 text-orange-400" : "bg-orange-100 text-orange-900"}`}>
                    <th className={`p-3 border-b text-left ${modoOscuro ? "border-gray-700" : "border-orange-100"}`}>Trabajadores</th>
                    {diasDeLaSemana.map((dia) => (
                        diasVisibles[dia.key as keyof typeof diasVisibles] && (
                        <th key={dia.key} className={`p-3 border-l border-b w-32 ${modoOscuro ? "border-gray-700" : "border-orange-100"}`}>{dia.label}</th>
                        )
                    ))}
                    <th className={`p-3 border-l border-b w-20 ${modoOscuro ? "border-gray-700" : "border-orange-100"}`}></th>
                    </tr>
                </thead>
                <tbody>
                    {horarios.map((fila, index) => {
                    if (fila.visible === false) return null;
                    return (
                        <tr key={index} className={`transition group border-b last:border-b-0 ${modoOscuro ? "border-gray-800" : "border-gray-100"}`}>
                        <td className={`p-0 border-r relative ${modoOscuro ? "border-gray-800" : "border-gray-100"}`}>
                            <input
                            type="text"
                            value={fila.trabajador}
                            onChange={(e) => actualizarHorario(index, "trabajador", e.target.value)}
                            className={`w-full p-3 font-bold focus:outline-none transition-colors ${modoOscuro ? "bg-transparent text-gray-200 focus:bg-gray-800" : "bg-transparent text-gray-800 focus:bg-orange-50"}`}
                            />
                        </td>
                        {diasDeLaSemana.map((dia) => {
                            if (!diasVisibles[dia.key as keyof typeof diasVisibles]) return null;
                            const valorCelda = (fila as any)[dia.key] || "";
                            const esFranco = valorCelda.toLowerCase().includes("franco");
                            return (
                            <td key={dia.key} className={`p-0 border-r transition-colors ${modoOscuro ? (esFranco ? "bg-green-700/80 border-gray-800" : "bg-transparent border-gray-800") : (esFranco ? "bg-green-500 border-gray-100" : "bg-white border-gray-100")}`}>
                                <input
                                type="text"
                                value={valorCelda}
                                onChange={(e) => actualizarHorario(index, dia.key, e.target.value)}
                                className={`w-full p-3 text-center focus:outline-none transition-colors ${esFranco ? "text-white font-bold bg-transparent" : modoOscuro ? "bg-transparent text-gray-300 focus:bg-gray-800/50" : "bg-transparent text-gray-700 focus:bg-black/5"}`}
                                />
                            </td>
                            );
                        })}
                        <td className={`p-2 text-center transition-colors ${modoOscuro ? "bg-gray-900 group-hover:bg-gray-800/50" : "bg-white group-hover:bg-gray-50"}`}>
                            <button onClick={() => solicitarEliminarFilaHorario(index)} className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg transition-colors mx-auto block"><Trash2 size={16} /></button>
                        </td>
                        </tr>
                    );
                    })}
                </tbody>
                </table>
            </div>
            
            <div className="mt-4 flex justify-end">
                <button onClick={agregarFilaHorario} className={`font-semibold py-2 px-4 rounded-xl text-xs flex items-center gap-2 transition border ${modoOscuro ? "bg-orange-900/20 hover:bg-orange-900/40 text-orange-400 border-orange-800/50" : "bg-orange-100 hover:bg-orange-200 text-orange-800 border-orange-200"}`}>
                <Plus size={16} /> Agregar Trabajador
                </button>
            </div>
            </div>

            {/* --- MÓDULO 2: PLANILLA DE PAGOS DIARIA --- */}
            <div className={`rounded-2xl p-6 shadow-sm border mb-10 ${modoOscuro ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <h2 className={`text-lg font-bold flex items-center gap-2 ${modoOscuro ? "text-white" : "text-gray-800"}`}>
                <UserCheck size={20} className="text-blue-500"/> Planilla de Pagos Diaria
                </h2>
                <button onClick={() => setMostrarFormNuevo(!mostrarFormNuevo)} className={`font-semibold py-2 px-4 rounded-xl text-xs flex items-center gap-2 transition ${modoOscuro ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-gray-900 hover:bg-gray-800 text-white"}`}>
                <Plus size={16} /> Agregar Empleado a Pagos
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                <thead>
                    <tr className={`border-b uppercase text-xs ${modoOscuro ? "border-gray-800 text-gray-500" : "border-gray-100 text-gray-400"}`}>
                    <th className="pb-3 font-semibold">Empleado</th>
                    <th className="pb-3 font-semibold text-center">Horas</th>
                    <th className="pb-3 font-semibold text-center">Descuento ($)</th>
                    <th className="pb-3 font-semibold text-center">Sueldo x Hora</th>
                    <th className="pb-3 font-semibold text-right">Total a Pagar</th>
                    <th className="pb-3 font-semibold text-center">Estado</th>
                    <th className="pb-3 text-right">Acción</th>
                    </tr>
                </thead>
                <tbody className={`divide-y ${modoOscuro ? "divide-gray-800" : "divide-gray-50"}`}>
                    {planilla.map((item) => {
                    const totalFila = calcularTotalFila(item);
                    return (
                        <tr key={item.id} className={`transition ${modoOscuro ? "hover:bg-gray-800/50" : "hover:bg-gray-50/50"}`}>
                        <td className={`py-3 font-bold ${modoOscuro ? "text-gray-200" : "text-gray-800"}`}>{item.nombre}</td>
                        <td className="py-3 text-center">
                            <input type="number" step="any" min="0" value={item.horas} onChange={(e) => actualizarFilaSueldo(item.id, "horas", e.target.value === "" ? "" : Number(e.target.value))} className={`w-16 text-center px-2 py-1.5 rounded-lg border focus:outline-none font-bold ${modoOscuro ? "bg-gray-800 border-gray-700 text-white focus:ring-blue-500" : "bg-white border-gray-200 text-gray-900 focus:ring-blue-500"}`} />
                        </td>
                        <td className="py-3 text-center">
                            <input type="number" step="any" min="0" value={item.descuento} onChange={(e) => actualizarFilaSueldo(item.id, "descuento", e.target.value === "" ? "" : Number(e.target.value))} className={`w-20 text-center px-2 py-1.5 rounded-lg border focus:outline-none ${modoOscuro ? "bg-gray-800 border-gray-700 text-gray-300 focus:ring-blue-500" : "bg-white border-gray-200 text-gray-600 focus:ring-blue-500"}`} />
                        </td>
                        <td className="py-3 text-center">
                            <input type="number" step="any" min="0" value={item.sueldoHora} onChange={(e) => actualizarFilaSueldo(item.id, "sueldoHora", e.target.value === "" ? "" : Number(e.target.value))} className={`w-24 text-center px-2 py-1.5 rounded-lg border focus:outline-none font-semibold ${modoOscuro ? "bg-gray-800 border-gray-700 text-gray-300 focus:ring-blue-500" : "bg-white border-gray-200 text-gray-700 focus:ring-blue-500"}`} />
                        </td>
                        <td className={`py-3 text-right font-bold text-base ${modoOscuro ? "text-white" : "text-gray-900"}`}>
                            ${Number(totalFila || 0).toLocaleString("es-AR")}
                        </td>
                        <td className="py-3 text-center">
                            <select value={item.pagado ? "pagado" : "pendiente"} onChange={(e) => actualizarFilaSueldo(item.id, "pagado", e.target.value === "pagado")} className={`text-xs font-bold px-2 py-1.5 rounded-lg border cursor-pointer ${item.pagado ? (modoOscuro ? "bg-green-900/30 text-green-400 border-green-800" : "bg-green-100 text-green-800 border-green-200") : (modoOscuro ? "bg-amber-900/30 text-amber-400 border-amber-800" : "bg-amber-100 text-amber-800 border-amber-200")}`}>
                            <option value="pagado">Pagado</option>
                            <option value="pendiente">Pendiente</option>
                            </select>
                        </td>
                        <td className="py-3 text-right">
                            <button onClick={() => eliminarEmpleadoPlanilla(item.id)} className="text-gray-400 hover:text-red-500 transition p-1"><Trash2 size={16} /></button>
                        </td>
                        </tr>
                    );
                    })}
                </tbody>
                </table>
            </div>

            <div className={`mt-6 pt-6 border-t flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-xl ${modoOscuro ? "bg-gray-800/50 border-gray-800" : "bg-gray-50 border-gray-100"}`}>
                <div>
                <span className={`text-xs font-bold uppercase block ${modoOscuro ? "text-gray-500" : "text-gray-400"}`}>Total a pagar del día</span>
                <span className={`text-3xl font-extrabold ${modoOscuro ? "text-white" : "text-gray-900"}`}>${Number(totalDiaGlobal || 0).toLocaleString("es-AR")}</span>
                </div>
                <button onClick={registrarPagosDelDia} disabled={guardando} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl flex items-center justify-center gap-2 transition shadow-sm text-sm">
                {guardando ? <Loader2 size={18} className="animate-spin" /> : <><DollarSign size={18} /> Registrar Pagos</>}
                </button>
            </div>
            </div>

            {/* --- MÓDULO 3: HISTORIAL CON SELECTOR DE FECHA --- */}
            <div className={`rounded-2xl p-6 shadow-sm border transition-colors ${modoOscuro ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                <h2 className={`text-lg font-bold flex items-center gap-2 ${modoOscuro ? "text-white" : "text-gray-800"}`}>
                    <FileText size={20} className="text-blue-500"/> Historial de Sueldos Pagados
                </h2>
                </div>
            </div>

            <div className={`flex flex-wrap items-center gap-2 mb-6 p-3 rounded-xl border ${modoOscuro ? "bg-gray-800/50 border-gray-800" : "bg-gray-50 border-gray-100"}`}>
                <button onClick={() => setFiltroFecha("hoy")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${filtroFecha === "hoy" ? "bg-blue-600 text-white shadow-sm" : modoOscuro ? "bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"}`}>
                Hoy
                </button>
                <button onClick={() => setFiltroFecha("semana")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${filtroFecha === "semana" ? "bg-blue-600 text-white shadow-sm" : modoOscuro ? "bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"}`}>
                Últimos 7 días
                </button>
                <button onClick={() => setFiltroFecha("mes")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${filtroFecha === "mes" ? "bg-blue-600 text-white shadow-sm" : modoOscuro ? "bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"}`}>
                Este Mes
                </button>
                <button onClick={() => setFiltroFecha("todos")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${filtroFecha === "todos" ? "bg-blue-600 text-white shadow-sm" : modoOscuro ? "bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"}`}>
                Todos
                </button>
                
                <div className={`h-4 w-px mx-2 hidden sm:block ${modoOscuro ? "bg-gray-700" : "bg-gray-300"}`}></div>
                
                <label className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition border cursor-pointer ${filtroFecha === "exacta" ? "bg-blue-600 text-white border-blue-600 shadow-sm" : modoOscuro ? "bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-100"}`}>
                <Calendar size={14}/> 
                <span className={filtroFecha === "exacta" ? "text-white" : modoOscuro ? "text-gray-400" : "text-gray-500"}>Elegir Día:</span>
                <input
                    type="date"
                    value={fechaExacta}
                    onChange={(e) => {
                    setFiltroFecha("exacta");
                    setFechaExacta(e.target.value);
                    }}
                    className={`outline-none cursor-pointer text-xs font-bold ${filtroFecha === "exacta" ? "bg-transparent text-white" : "bg-transparent " + (modoOscuro ? "text-gray-200" : "text-gray-800")}`}
                    style={modoOscuro && filtroFecha !== "exacta" ? { colorScheme: "dark" } : {}}
                />
                </label>
            </div>

            {cargandoHistorial ? (
                <div className="flex justify-center py-10 text-gray-400">
                <Loader2 size={32} className="animate-spin" />
                </div>
            ) : historialFiltrado.length === 0 ? (
                <p className={`text-center py-10 text-sm ${modoOscuro ? "text-gray-500" : "text-gray-400"}`}>
                No hay registros de sueldos en la fecha seleccionada.
                </p>
            ) : (
                <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                    <tr className={`border-b uppercase text-xs ${modoOscuro ? "border-gray-800 text-gray-500" : "border-gray-100 text-gray-400"}`}>
                        <th className="pb-3 font-semibold">Empleado</th>
                        <th className="pb-3 font-semibold text-center">Horas</th>
                        <th className="pb-3 font-semibold text-right">Valor Hora</th>
                        <th className="pb-3 font-semibold text-right">Descuento</th>
                        <th className="pb-3 font-semibold text-right">Total Liquidado</th>
                        <th className="pb-3 font-semibold text-center">Estado</th>
                        <th className="pb-3 font-semibold">Fecha</th>
                        <th className="pb-3 text-right">Acción</th>
                    </tr>
                    </thead>
                    <tbody className={`divide-y ${modoOscuro ? "divide-gray-800" : "divide-gray-50"}`}>
                    {historialFiltrado.map((h) => (
                        <tr key={h.$id} className={`transition ${modoOscuro ? "hover:bg-gray-800/50" : "hover:bg-gray-50/50"}`}>
                        <td className={`py-3 font-bold ${modoOscuro ? "text-gray-200" : "text-gray-800"}`}>{h.empleado}</td>
                        <td className={`py-3 text-center font-semibold ${modoOscuro ? "text-gray-400" : "text-gray-600"}`}>{h.horas_trabajadas} hs</td>
                        <td className={`py-3 text-right ${modoOscuro ? "text-gray-500" : "text-gray-500"}`}>${Number(h.sueldo_por_hora || 0).toLocaleString("es-AR")}</td>
                        <td className={`py-3 text-right ${modoOscuro ? "text-gray-500" : "text-gray-500"}`}>${Number(h.descontar || 0).toLocaleString("es-AR")}</td>
                        <td className={`py-3 text-right font-extrabold ${modoOscuro ? "text-white" : "text-gray-900"}`}>${Number(h.total_pagar || 0).toLocaleString("es-AR")}</td>
                        <td className="py-3 text-center">
                            <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase ${h.estado === "pagado" ? (modoOscuro ? "bg-green-900/30 text-green-400" : "bg-green-100 text-green-700") : (modoOscuro ? "bg-amber-900/30 text-amber-400" : "bg-amber-100 text-amber-700")}`}>
                            {h.estado}
                            </span>
                        </td>
                        <td className={`py-3 text-xs ${modoOscuro ? "text-gray-500" : "text-gray-400"}`}>
                            {new Date(h.fecha || h.$createdAt).toLocaleString("es-AR")}
                        </td>
                        <td className="py-3 text-right">
                            <button onClick={() => solicitarEliminarRegistroHistorial(h.$id)} className={`transition p-1 ${modoOscuro ? "text-gray-500 hover:text-red-400" : "text-gray-400 hover:text-red-600"}`}>
                            <Trash2 size={16} />
                            </button>
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
            )}
            </div>

        </div>
        </div>
    );
    }