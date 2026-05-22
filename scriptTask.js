import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

/* =========================================
   CLIENTE SUPABASE
   ========================================= */
const supabase = createClient(
    "https://wwenifzptzjzonstlkec.supabase.co",
    "sb_publishable_hS0YEGX2SRAzWENbjxZ62A_DWzc2Sy9"
);

document.addEventListener('DOMContentLoaded', () => {

    const body = document.body;
    const modal = document.getElementById("modalTarea");
    const formTarea = document.getElementById("formTarea");
    const btnAbrirModal = document.querySelector(".btn-agregar") || document.querySelector("#btnNuevaTarea");
    const btnCerrarModal = document.getElementById("cerrarModal");
    const btnAddSubtarea = document.getElementById("addSubtarea");
    const containerSubtareas = document.getElementById("subtareas");
    const alerta = document.getElementById('miAlerta');

    function mostrarNotificacion(mensaje, tipo = 'success') {
        if (!alerta) return;
        alerta.textContent = mensaje;
        alerta.style.borderLeftColor = tipo === 'error' ? '#ff4757' : 'var(--accent)';
        alerta.classList.add('show');
        setTimeout(() => alerta.classList.remove('show'), 3000);
    }

    /* TEMA */
    const menuLinks = document.querySelectorAll('.menu a');
    menuLinks.forEach(link => {
        link.addEventListener('click', function() {
            menuLinks.forEach(item => item.classList.remove('active'));
            this.classList.add('active');
        });
    });

    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
        const themeIcon = themeToggleBtn.querySelector('i');
        if (localStorage.getItem('theme') === 'light') enableLightMode();
        themeToggleBtn.addEventListener('click', () => {
            body.classList.contains('light-mode') ? enableDarkMode() : enableLightMode();
        });
        function enableLightMode() {
            body.classList.add('light-mode');
            themeIcon.classList.replace('fa-sun', 'fa-moon');
            localStorage.setItem('theme', 'light');
        }
        function enableDarkMode() {
            body.classList.remove('light-mode');
            themeIcon.classList.replace('fa-moon', 'fa-sun');
            localStorage.setItem('theme', 'dark');
        }
    }

    /* MODAL NUEVA TAREA */
    function cerrarYLimpiarModal() { modal?.classList.add("oculto"); }
    btnAbrirModal?.addEventListener("click", () => modal.classList.remove("oculto"));
    btnCerrarModal?.addEventListener("click", cerrarYLimpiarModal);
    window.addEventListener('click', e => { if (e.target === modal) cerrarYLimpiarModal(); });

    /* SUBTAREAS DINÁMICAS */
    btnAddSubtarea?.addEventListener("click", () => {
        const n = containerSubtareas.querySelectorAll('input').length + 1;
        const inp = document.createElement("input");
        inp.type = "text"; inp.name = "subtareas[]"; inp.placeholder = `Subtarea ${n}`;
        inp.style.animation = "fadeIn 0.3s ease";
        containerSubtareas.appendChild(inp);
    });

    /* GUARDAR TAREA */
    formTarea?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const fd = new FormData(formTarea);
        const subtareasJson = JSON.stringify(fd.getAll('subtareas[]').filter(s => s.trim()));
        const { error } = await supabase.from('tareas').insert([{
            titulo: fd.get('titulo'), descripcion: fd.get('descripcion'),
            fecha_entrega: fd.get('fecha_entrega') || null,
            importancia: fd.get('importancia'), subtareas: subtareasJson, estado: 'activa'
        }]);
        if (!error) { cerrarYLimpiarModal(); formTarea.reset(); mostrarNotificacion("Tarea guardada :3"); cargarTareas(); }
        else mostrarNotificacion("Error: " + error.message, "error");
    });

    /* CARGAR TAREAS */
    cargarTareas();
    async function cargarTareas() {
        const { data: tareas, error } = await supabase.from('tareas')
            .select('id, titulo, descripcion, fecha_entrega, importancia, subtareas, estado')
            .order('fecha_entrega', { ascending: true });
        if (error) { console.error(error); return; }

        const listas = { alta: document.getElementById('high-list'), media: document.getElementById('medium-list'), baja: document.getElementById('low-list') };
        if (!listas.alta) return;
        const contadores = { alta: 0, media: 0, baja: 0 };
        Object.values(listas).forEach(l => l.innerHTML = '');
        tareas.sort((a,b) => !a.fecha_entrega ? 1 : !b.fecha_entrega ? -1 : new Date(a.fecha_entrega)-new Date(b.fecha_entrega));
        const limite = { alta: 0, media: 0, baja: 0 };
        tareas.forEach(tarea => {
            if (tarea.estado !== 'activa') return;
            if (limite[tarea.importancia] >= 4) return;
            const color = tarea.importancia === 'alta' ? 'var(--color-high)' : tarea.importancia === 'media' ? 'var(--color-med)' : 'var(--color-low)';
            const badge = tarea.subtareas && tarea.subtareas.length > 5 ? `<span class="task-badge"><i class="fa-solid fa-list-check"></i> Subtareas</span>` : '';
            const card = document.createElement('div');
            card.className = 'task-card'; card.style.borderLeft = `4px solid ${color}`;
            card.setAttribute('draggable','true'); card.dataset.id = tarea.id; card.dataset.importancia = tarea.importancia;
            card.innerHTML = `<h4>${tarea.titulo}</h4>${tarea.descripcion?`<p class="task-desc">${tarea.descripcion}</p>`:''}<div class="task-footer"><span class="task-date" style="color:${color};"><i class="fa-regular fa-calendar"></i> ${tarea.fecha_entrega||'Sin fecha'}</span>${badge}</div>`;
            card.addEventListener('dragstart', onDragStart); card.addEventListener('dragend', onDragEnd);
            card.tareaData = tarea;
            card.addEventListener('click', () => abrirDetalleTarea(card.tareaData));
            listas[tarea.importancia].appendChild(card);
            contadores[tarea.importancia]++; limite[tarea.importancia]++;
        });
        document.querySelector('.high-priority .count').textContent  = contadores.alta;
        document.querySelector('.medium-priority .count').textContent = contadores.media;
        document.querySelector('.low-priority .count').textContent   = contadores.baja;
        activarDropZones();
    }

    /* DRAG & DROP */
    let tarjetaArrastrada = null;
    function onDragStart() { tarjetaArrastrada = this; setTimeout(() => this.classList.add('dragging'), 0); }
    function onDragEnd()   { this.classList.remove('dragging'); document.querySelectorAll('.task-list').forEach(l=>l.classList.remove('drag-over')); tarjetaArrastrada = null; }
    function activarDropZones() {
        document.querySelectorAll('.task-list').forEach(lista => {
            lista.addEventListener('dragover', e => { e.preventDefault(); lista.classList.add('drag-over'); });
            lista.addEventListener('dragleave', () => lista.classList.remove('drag-over'));
            lista.addEventListener('drop', async e => {
                e.preventDefault(); lista.classList.remove('drag-over');
                if (!tarjetaArrastrada) return;
                const mapa = {'high-list':'alta','medium-list':'media','low-list':'baja'};
                const nuevaImp = mapa[lista.id];
                if (!nuevaImp || tarjetaArrastrada.dataset.importancia === nuevaImp) return;
                const { error } = await supabase.from('tareas').update({importancia:nuevaImp}).eq('id', tarjetaArrastrada.dataset.id);
                if (!error) { mostrarNotificacion(`Tarea a ${nuevaImp} prioridad :0`); cargarTareas(); }
                else mostrarNotificacion('Error al mover la tarea','error');
            });
        });
    }

    /* MODAL DETALLE */
    const modalDetalle = document.getElementById('modalDetalle');
    document.getElementById('cerrarDetalle')?.addEventListener('click', () => modalDetalle.classList.add('oculto'));
    window.addEventListener('click', e => { if (e.target === modalDetalle) modalDetalle.classList.add('oculto'); });

    function abrirDetalleTarea(tarea) {
        document.getElementById('detalle-titulo').textContent = tarea.titulo;
        const badge = document.getElementById('detalle-badge-prioridad');
        badge.textContent = tarea.importancia.charAt(0).toUpperCase() + tarea.importancia.slice(1) + ' prioridad';
        badge.className = 'badge-prioridad badge-' + tarea.importancia;
        document.getElementById('detalle-descripcion').textContent = tarea.descripcion || 'Sin descripción';
        const cf = document.getElementById('detalle-fecha');
        if (tarea.fecha_entrega) { cf.innerHTML=''; cf.appendChild(generarCalendario(tarea.fecha_entrega)); } else cf.textContent='Sin fecha';
        let subtareas = [];
        try { subtareas = (tarea.subtareas ? JSON.parse(tarea.subtareas) : []).filter(s=>s!=null&&s!='').map(s=>typeof s==='string'?{texto:s,completada:false}:s); } catch(e){}
        renderizarSubtareas(subtareas, tarea.id);
        ['detalle-add-subtarea','detalle-confirmar-subtarea','detalle-cancelar-subtarea'].forEach(id => {
            document.getElementById(id).replaceWith(document.getElementById(id).cloneNode(true));
        });
        const inputNueva = document.getElementById('detalle-input-nueva-subtarea');
        const txt = document.getElementById('detalle-nueva-subtarea-txt');
        document.getElementById('detalle-add-subtarea').addEventListener('click', () => { inputNueva.style.display='flex'; txt.focus(); });
        document.getElementById('detalle-cancelar-subtarea').addEventListener('click', () => { inputNueva.style.display='none'; txt.value=''; });
        document.getElementById('detalle-confirmar-subtarea').addEventListener('click', async () => {
            const t = txt.value.trim(); if (!t) return;
            subtareas.push({texto:t,completada:false});
            await guardarSubtareas(tarea.id, subtareas);
            const card = document.querySelector(`.task-card[data-id="${tarea.id}"]`);
            if (card) card.tareaData.subtareas = JSON.stringify(subtareas);
            renderizarSubtareas(subtareas, tarea.id); inputNueva.style.display='none'; txt.value='';
            mostrarNotificacion('Subtarea añadida :3');
        });
        const colores = { alta:{border:'#ff4757',shadow:'rgba(255,71,87,0.5)'}, media:{border:'#ffa502',shadow:'rgba(255,165,2,0.5)'}, baja:{border:'#2ed573',shadow:'rgba(46,213,115,0.5)'} };
        const c = colores[tarea.importancia] || colores.media;
        const mc = modalDetalle.querySelector('.modal-content');
        mc.style.setProperty('--border-prioridad', c.border);
        mc.style.setProperty('--shadow-prioridad', c.shadow);
        modalDetalle.classList.remove('oculto');
    }

    function generarCalendario(fechaEntrega) {
        const hoy = new Date(); hoy.setHours(0,0,0,0);
        const [anio,mes,dia] = fechaEntrega.split('-').map(Number);
        const fechaObj = new Date(anio,mes-1,dia);
        const primerDia = new Date(anio,mes-1,1).getDay();
        const diasEnMes = new Date(anio,mes,0).getDate();
        const meses=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
        const ds=['Do','Lu','Ma','Mi','Ju','Vi','Sá'];
        const w=document.createElement('div'); w.className='mini-calendario';
        const h=document.createElement('div'); h.className='cal-header'; h.textContent=`${meses[mes-1]} ${anio}`; w.appendChild(h);
        const g=document.createElement('div'); g.className='cal-grid';
        ds.forEach(d=>{const s=document.createElement('span');s.className='cal-dia-nombre';s.textContent=d;g.appendChild(s);});
        for(let i=0;i<primerDia;i++){const v=document.createElement('span');v.className='cal-vacio';g.appendChild(v);}
        for(let d=1;d<=diasEnMes;d++){
            const c=document.createElement('span');c.className='cal-dia';c.textContent=d;
            const fd=new Date(anio,mes-1,d);
            if(d===dia) c.classList.add('cal-entrega');
            else if(fd>hoy&&fd<fechaObj) c.classList.add('cal-falta');
            else if(fd<hoy) c.classList.add('cal-pasado');
            g.appendChild(c);
        }
        w.appendChild(g);
        const diff=Math.ceil((fechaObj-hoy)/(1000*60*60*24));
        const ley=document.createElement('div'); ley.className='cal-leyenda';
        ley.innerHTML = diff>0?`<span class="cal-falta-txt">🟢 Faltan <strong>${diff}</strong> día${diff!==1?'s':''}</span>`:diff===0?`<span class="cal-hoy-txt">🔴 ¡Vence hoy!</span>`:`<span class="cal-vencida-txt">⚠️ Venció hace <strong>${Math.abs(diff)}</strong> día${Math.abs(diff)!==1?'s':''}</span>`;
        w.appendChild(ley); return w;
    }

    function renderizarSubtareas(subtareas, tareaId) {
        const lista = document.getElementById('detalle-subtareas-lista'); lista.innerHTML='';
        if (!subtareas.length) { lista.innerHTML='<p style="color:var(--text-muted);font-size:.85rem;">Sin subtareas</p>'; return; }
        subtareas.forEach((sub,index) => {
            const item=document.createElement('div'); item.className='subtarea-item'+(sub.completada?' completada':'');
            const cb=document.createElement('input'); cb.type='checkbox'; cb.checked=sub.completada;
            cb.addEventListener('change', async()=>{subtareas[index].completada=cb.checked;item.classList.toggle('completada',cb.checked);await guardarSubtareas(tareaId,subtareas);const card=document.querySelector(`.task-card[data-id="${tareaId}"]`);if(card)card.tareaData.subtareas=JSON.stringify(subtareas);});
            const tx=document.createElement('span'); tx.className='subtarea-texto'; tx.textContent=sub.texto;
            const btn=document.createElement('button'); btn.className='btn-eliminar-sub'; btn.innerHTML='<i class="fa-solid fa-trash-can"></i>';
            btn.addEventListener('click',async()=>{subtareas.splice(index,1);await guardarSubtareas(tareaId,subtareas);const card=document.querySelector(`.task-card[data-id="${tareaId}"]`);if(card)card.tareaData.subtareas=JSON.stringify(subtareas);renderizarSubtareas(subtareas,tareaId);mostrarNotificacion('Subtarea eliminada oite bebé');});
            item.appendChild(cb); item.appendChild(tx); item.appendChild(btn); lista.appendChild(item);
        });
    }

    async function guardarSubtareas(tareaId, subtareas) {
        const { error } = await supabase.from('tareas').update({subtareas:JSON.stringify(subtareas)}).eq('id',tareaId);
        if (error) mostrarNotificacion('Error guardando subtareas :<','error');
    }

    /* MENÚ CONTEXTUAL */
    const contextMenu = document.getElementById('contextMenu');
    let tareaContextual=null, menuRecienAbierto=false;
    function ocultarContextMenu() { contextMenu.classList.remove('visible'); tareaContextual=null; }
    document.addEventListener('contextmenu', e => {
        const card = e.target.closest('.task-card'); if (!card) { ocultarContextMenu(); return; }
        e.preventDefault(); tareaContextual = card.tareaData;
        const {clientX:x,clientY:y} = e; const mW=210,mH=170,wW=window.innerWidth,wH=window.innerHeight;
        contextMenu.style.left=(x+mW>wW?wW-mW-10:x)+'px'; contextMenu.style.top=(y+mH>wH?wH-mH-10:y)+'px';
        contextMenu.classList.add('visible'); menuRecienAbierto=true; setTimeout(()=>menuRecienAbierto=false,200);
    });
    document.addEventListener('click', e => { if (menuRecienAbierto) return; if (!contextMenu.contains(e.target)) ocultarContextMenu(); });
    document.addEventListener('keydown', e => { if (e.key==='Escape') ocultarContextMenu(); });

    async function cambiarEstadoTarea(tarea, nuevoEstado) {
        const card = document.querySelector(`.task-card[data-id="${tarea.id}"]`);
        if (card) { card.classList.add('animacion-salida'); await new Promise(r=>setTimeout(r,400)); }
        const { error } = await supabase.from('tareas').update({estado:nuevoEstado}).eq('id',tarea.id);
        if (!error) { mostrarNotificacion(`Tarea marcada como ${nuevoEstado} amorcites`); cargarTareas(); }
        else { mostrarNotificacion('Error al actualizar','error'); card?.classList.remove('animacion-salida'); }
    }

    async function eliminarTarea(tarea) {
        const card = document.querySelector(`.task-card[data-id="${tarea.id}"]`);
        if (card) { card.classList.add('animacion-eliminar'); await new Promise(r=>setTimeout(r,500)); }
        const { error } = await supabase.from('tareas').delete().eq('id',tarea.id);
        if (!error) { mostrarNotificacion('Tarea eliminada :3'); cargarTareas(); }
        else { mostrarNotificacion('Error al eliminar','error'); card?.classList.remove('animacion-eliminar'); }
    }

    /* MODAL EDITAR */
    const modalEditar = document.getElementById('modalEditar');
    document.getElementById('cerrarModalEditar')?.addEventListener('click', () => modalEditar.classList.add('oculto'));
    window.addEventListener('click', e => { if (e.target===modalEditar) modalEditar.classList.add('oculto'); });

    function abrirModalEditar(tarea) {
        document.getElementById('editar-id').value=tarea.id;
        document.getElementById('editar-titulo').value=tarea.titulo;
        document.getElementById('editar-descripcion').value=tarea.descripcion||'';
        document.getElementById('editar-fecha').value=tarea.fecha_entrega||'';
        document.querySelectorAll('input[name="editar-importancia"]').forEach(r=>r.checked=r.value===tarea.importancia);
        modalEditar.classList.remove('oculto');
    }

    document.getElementById('formEditar')?.addEventListener('submit', async e => {
        e.preventDefault();
        const id=document.getElementById('editar-id').value;
        const titulo=document.getElementById('editar-titulo').value;
        const descripcion=document.getElementById('editar-descripcion').value;
        const fecha=document.getElementById('editar-fecha').value;
        const importancia=document.querySelector('input[name="editar-importancia"]:checked')?.value;
        if (!['alta','media','baja'].includes(importancia)) { mostrarNotificacion('Importancia inválida','error'); return; }
        const { error } = await supabase.from('tareas').update({titulo,descripcion,fecha_entrega:fecha||null,importancia}).eq('id',id);
        if (!error) { modalEditar.classList.add('oculto'); mostrarNotificacion('Tarea actualizada amorcito'); cargarTareas(); }
        else mostrarNotificacion('Error al guardar','error');
    });

    contextMenu.querySelectorAll('.context-menu-item').forEach(item => {
        item.addEventListener('click', () => {
            const accion=item.dataset.accion; if (!tareaContextual) return;
            const tarea=tareaContextual; ocultarContextMenu();
            if (accion==='terminada') cambiarEstadoTarea(tarea,'terminada');
            else if (accion==='cancelada') cambiarEstadoTarea(tarea,'cancelada');
            else if (accion==='eliminar') eliminarTarea(tarea);
            else if (accion==='editar') abrirModalEditar(tarea);
        });
    });

    /* =========================================
       VISTAS — helper para ocultar todo
       ========================================= */
    const taskBoard      = document.querySelector('.task-board');
    const vistaMisTareas = document.getElementById('vista-mis-tareas');
    const vistaCalendario= document.getElementById('vista-calendario');
    const vistaApuntes   = document.getElementById('vista-apuntes');

function ocultarTodasLasVistas() {
    taskBoard.classList.add('vista-oculta');
    vistaMisTareas.classList.remove('vista-activa');
    vistaCalendario.classList.remove('vista-activa');
    document.getElementById('vista-apuntes')?.classList.remove('vista-activa');
    document.getElementById('vista-configuraciones')?.classList.remove('vista-activa');
    document.getElementById('vista-sugerencias')?.classList.remove('vista-activa'); // ← añade esta
}

    /* MIS TAREAS */
    const misTareasLista = document.getElementById('mis-tareas-lista');
    let filtroActual = 'todas';

    document.querySelectorAll('.menu a').forEach(link => {
        link.addEventListener('click', function(e) {
            const texto = this.textContent.trim();
            if (texto.includes('Mis tareas'))     { e.preventDefault(); mostrarVistaMisTareas(); }
            else if (texto.includes('Panel principal')) { mostrarVistaPrincipal(); }
        });
    });

    function mostrarVistaMisTareas() {
        ocultarTodasLasVistas(); vistaMisTareas.classList.add('vista-activa');
        document.querySelector('.top-bar .greeting h1').textContent = 'Mis tareas';
        renderizarMisTareas(filtroActual);
    }
    function mostrarVistaPrincipal() {
        ocultarTodasLasVistas(); taskBoard.classList.remove('vista-oculta');
        document.querySelector('.top-bar .greeting h1').textContent = 'Gestor de tareas';
    }

    async function renderizarMisTareas(filtro) {
        let q = supabase.from('tareas').select('id,titulo,descripcion,fecha_entrega,importancia,subtareas,estado').order('fecha_entrega',{ascending:true});
        if (filtro!=='todas') q=q.eq('estado',filtro);
        const {data:tareas,error}=await q; if(error){console.error(error);return;}
        misTareasLista.innerHTML='';
        if(!tareas||!tareas.length){misTareasLista.innerHTML=`<p style="color:var(--text-muted);text-align:center;margin-top:40px;">No hay tareas aquí todavía</p>`;return;}
        tareas.forEach(tarea=>{
            let subs=[]; try{subs=(tarea.subtareas?JSON.parse(tarea.subtareas):[]).filter(s=>s&&s!='');}catch(e){}
            const comp=subs.filter(s=>s.completada).length, total=subs.length;
            const fila=document.createElement('div'); fila.className=`mt-fila estado-${tarea.estado||'activa'}`; fila.dataset.id=tarea.id;
            fila.innerHTML=`<div class="mt-checkbox">${tarea.estado==='terminada'?'<i class="fa-solid fa-check" style="font-size:.7rem;"></i>':''}</div><div class="mt-info"><h4>${tarea.titulo}</h4>${tarea.descripcion?`<p>${tarea.descripcion}</p>`:''}</div><span class="mt-fecha"><i class="fa-regular fa-calendar"></i> ${tarea.fecha_entrega||'Sin fecha'}</span><span class="mt-estado ${tarea.estado||'activa'}">${tarea.estado?tarea.estado.charAt(0).toUpperCase()+tarea.estado.slice(1):'Activa'}</span><span class="mt-subtareas"><i class="fa-solid fa-list-check"></i> ${total>0?comp+'/'+total:'0'}</span>`;
            fila.addEventListener('click',()=>abrirDetalleTarea(tarea)); fila.tareaData=tarea;
            misTareasLista.appendChild(fila);
        });
    }

    document.querySelectorAll('.tab-btn').forEach(btn=>{
        btn.addEventListener('click',()=>{
            document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
            btn.classList.add('active'); filtroActual=btn.dataset.filtro; renderizarMisTareas(filtroActual);
        });
    });

    /* MENÚ CONTEXTUAL MIS TAREAS */
    const contextMenuMT=document.getElementById('contextMenuMT');
    let tareaContextualMT=null, menuMTRecienAbierto=false;
    function ocultarContextMenuMT(){contextMenuMT.classList.remove('visible');tareaContextualMT=null;}
    document.addEventListener('contextmenu',e=>{
        const fila=e.target.closest('.mt-fila'); if(!fila){ocultarContextMenuMT();return;}
        e.preventDefault(); tareaContextualMT=fila.tareaData;
        const estado=tareaContextualMT?.estado||'activa';
        const btnActivar=contextMenuMT.querySelector('[data-accion-mt="activar"]');
        btnActivar.style.display=estado==='activa'?'none':'flex';
        const {clientX:x,clientY:y}=e;
        contextMenuMT.style.left=(x+210>window.innerWidth?window.innerWidth-220:x)+'px';
        contextMenuMT.style.top=(y+160>window.innerHeight?window.innerHeight-170:y)+'px';
        contextMenuMT.classList.add('visible'); menuMTRecienAbierto=true; setTimeout(()=>menuMTRecienAbierto=false,200);
    });
    document.addEventListener('click',e=>{if(menuMTRecienAbierto)return;if(!contextMenuMT.contains(e.target))ocultarContextMenuMT();});
    contextMenuMT.querySelectorAll('[data-accion-mt]').forEach(item=>{
        item.addEventListener('click',()=>{
            const accion=item.dataset.accionMt; if(!tareaContextualMT)return;
            const tarea=tareaContextualMT; ocultarContextMenuMT();
            if(accion==='activar'){cambiarEstadoTarea(tarea,'activa').then(()=>{mostrarNotificacion('La tarea fue activada otave :0');renderizarMisTareas(filtroActual);});}
            else if(accion==='eliminar'){
                const fila=document.querySelector(`.mt-fila[data-id="${tarea.id}"]`);
                if(fila){fila.style.transition='all 0.4s ease';fila.style.opacity='0';fila.style.transform='translateX(60px)';setTimeout(async()=>{await eliminarTarea(tarea);renderizarMisTareas(filtroActual);},400);}
                else eliminarTarea(tarea).then(()=>renderizarMisTareas(filtroActual));
            } else if(accion==='editar') abrirModalEditar(tarea);
        });
    });

    /* CAMPANA */
    const btnCampana=document.getElementById('btnCampana'), campanaPunto=document.getElementById('campanaPunto');
    let panelNotif=null, tareasProximas=[];
    function claveHoy(){return 'campana_vista_'+new Date().toISOString().split('T')[0];}
    async function verificarTareasProximas(){
        const {data:tareas,error}=await supabase.from('tareas').select('id,titulo,fecha_entrega,importancia,estado').eq('estado','activa').not('fecha_entrega','is',null);
        if(error||!tareas)return;
        const hoy=new Date(); hoy.setHours(0,0,0,0);
        tareasProximas=tareas.filter(t=>{const[a,m,d]=t.fecha_entrega.split('-').map(Number);return Math.ceil((new Date(a,m-1,d)-hoy)/(864e5))<=7;});
        if(tareasProximas.length>0){if(!localStorage.getItem(claveHoy())){btnCampana.classList.add('campanando');campanaPunto.classList.add('visible');}else campanaPunto.classList.add('visible');}
    }
    function abrirPanelNotificaciones(){
        if(panelNotif){cerrarPanelNotificaciones();return;}
        btnCampana.classList.remove('campanando'); campanaPunto.classList.remove('visible'); localStorage.setItem(claveHoy(),'true');
        const hoy=new Date(); hoy.setHours(0,0,0,0);
        panelNotif=document.createElement('div'); panelNotif.className='notif-panel';
        const n=tareasProximas.length;
        panelNotif.innerHTML=`<div class="notif-header"><h3>Tareas a punto de vencer</h3>${n>0?`<span>${n} tarea${n!==1?'s':''}</span>`:''}</div><div class="notif-lista" id="notifLista"></div>`;
        document.body.appendChild(panelNotif);
        const lista=document.getElementById('notifLista');
        if(!n){lista.innerHTML=`<p class="notif-vacia">🎉 ¡No tienes tareas urgentes!</p>`;}
        else tareasProximas.forEach(t=>{
            const[a,m,d]=t.fecha_entrega.split('-').map(Number);
            const diff=Math.ceil((new Date(a,m-1,d)-hoy)/864e5);
            const texto=diff===0?'¡Hoy!':diff===1?'Mañana':diff<0?`Venció hace ${Math.abs(diff)}d`:`${diff} días`;
            const item=document.createElement('div'); item.className='notif-item';
            item.innerHTML=`<span class="notif-urgencia ${diff<=2?'critica':'proxima'}"></span><div class="notif-info"><h4>${t.titulo}</h4><p>${t.fecha_entrega}</p></div><span class="notif-dias ${diff<=1?'hoy':'proxima'}">${texto}</span>`;
            lista.appendChild(item);
        });
        setTimeout(()=>document.addEventListener('click',cerrarAlClickAfuera),100);
    }
    function cerrarAlClickAfuera(e){if(panelNotif&&!panelNotif.contains(e.target)&&e.target!==btnCampana)cerrarPanelNotificaciones();}
    function cerrarPanelNotificaciones(){if(!panelNotif)return;panelNotif.classList.add('cerrando');setTimeout(()=>{panelNotif?.remove();panelNotif=null;},200);document.removeEventListener('click',cerrarAlClickAfuera);}
    btnCampana?.addEventListener('click',e=>{e.stopPropagation();abrirPanelNotificaciones();});
    localStorage.removeItem(claveHoy()); verificarTareasProximas(); setInterval(verificarTareasProximas,36e5);

    /* CALENDARIO */
    const calContenido=document.getElementById('calContenido'), calPrev=document.getElementById('calPrev'), calNext=document.getElementById('calNext');
    let semestreActual=0, anioActual=new Date().getFullYear(), tareasCalendario=[], tooltipEl=null;
    const mesesNombres=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const diasSemCal=['Do','Lu','Ma','Mi','Ju','Vi','Sá'];
    function semestresIniciales(){const m=new Date().getMonth();semestreActual=m<6?0:1;anioActual=new Date().getFullYear();}
    async function cargarTareasCalendario(){const{data,error}=await supabase.from('tareas').select('id,titulo,fecha_entrega,importancia,estado').eq('estado','activa').not('fecha_entrega','is',null);if(!error)tareasCalendario=data||[];}
    function getTareasDelDia(a,m,d){return tareasCalendario.filter(t=>{if(!t.fecha_entrega)return false;const[ta,tm,td]=t.fecha_entrega.split('-').map(Number);return ta===a&&tm===m+1&&td===d;});}
    function renderizarCalendario(dir=null){
        const ini=semestreActual===0?0:6, fin=ini+6, hoy=new Date();
        if(!calContenido)return;
        if(dir)calContenido.classList.add(dir==='next'?'saliendo-izq':'saliendo-der');
        const run=()=>{
            calContenido.innerHTML=''; calContenido.className='cal-semestres-grid';
            for(let mes=ini;mes<fin;mes++){
                const card=document.createElement('div'); card.className='cal-mes-card';
                const tit=document.createElement('div'); tit.className='cal-mes-titulo'; tit.textContent=mesesNombres[mes]; card.appendChild(tit);
                const grid=document.createElement('div'); grid.className='cal-mes-grid';
                diasSemCal.forEach(d=>{const s=document.createElement('span');s.className='cal-mes-dia-nombre';s.textContent=d;grid.appendChild(s);});
                const pd=new Date(anioActual,mes,1).getDay(), dm=new Date(anioActual,mes+1,0).getDate();
                for(let i=0;i<pd;i++){const v=document.createElement('span');v.className='cal-mes-vacio';grid.appendChild(v);}
                for(let d=1;d<=dm;d++){
                    const c=document.createElement('span'); c.className='cal-mes-dia'; c.textContent=d;
                    if(hoy.getFullYear()===anioActual&&hoy.getMonth()===mes&&hoy.getDate()===d)c.classList.add('es-hoy');
                    const td=getTareasDelDia(anioActual,mes,d);
                    if(td.length){c.classList.add('tiene-tarea');c.addEventListener('mouseenter',e=>mostrarTooltip(e,td));c.addEventListener('mousemove',e=>moverTooltip(e));c.addEventListener('mouseleave',ocultarTooltip);}
                    grid.appendChild(c);
                }
                card.appendChild(grid); calContenido.appendChild(card);
            }
            if(dir)calContenido.classList.add(dir==='next'?'entrando-izq':'entrando-der');
        };
        dir?setTimeout(run,280):run();
    }
    function mostrarTooltip(e,tareas){ocultarTooltip();tooltipEl=document.createElement('div');tooltipEl.className='cal-tooltip';tareas.forEach(t=>{const h=document.createElement('h4');h.textContent=t.titulo;const b=document.createElement('span');b.className=`cal-tooltip-badge ${t.importancia}`;b.textContent=t.importancia.charAt(0).toUpperCase()+t.importancia.slice(1);tooltipEl.appendChild(h);tooltipEl.appendChild(b);if(tareas.length>1){const s=document.createElement('hr');s.style.cssText='border:none;border-top:1px solid var(--border-light);margin:6px 0;';tooltipEl.appendChild(s);}});document.body.appendChild(tooltipEl);moverTooltip(e);}
    function moverTooltip(e){if(!tooltipEl)return;const x=e.clientX+14,y=e.clientY-10;tooltipEl.style.left=(x+tooltipEl.offsetWidth>window.innerWidth?e.clientX-tooltipEl.offsetWidth-10:x)+'px';tooltipEl.style.top=(y+tooltipEl.offsetHeight>window.innerHeight?e.clientY-tooltipEl.offsetHeight-10:y)+'px';}
    function ocultarTooltip(){tooltipEl?.remove();tooltipEl=null;}
    calPrev?.addEventListener('click',()=>{if(semestreActual===0){anioActual--;semestreActual=1;}else semestreActual=0;renderizarCalendario('prev');});
    calNext?.addEventListener('click',()=>{if(semestreActual===1){anioActual++;semestreActual=0;}else semestreActual=1;renderizarCalendario('next');});
    document.querySelectorAll('.menu a').forEach(link=>{
        link.addEventListener('click',async function(e){
            if(this.textContent.trim().includes('Calendario')){e.preventDefault();ocultarTodasLasVistas();vistaCalendario.classList.add('vista-activa');document.querySelector('.top-bar .greeting h1').textContent='Calendario';semestresIniciales();await cargarTareasCalendario();renderizarCalendario();}
        });
    });
/* =========================================
       15. VISTA APUNTES — REDISEÑADA
       ========================================= */
    const materiasGrid    = document.getElementById('materiasGrid');
    const btnNuevaMateria = document.getElementById('btnNuevaMateria');
    const modalMateria    = document.getElementById('modalMateria');
    const modalApunte     = document.getElementById('modalApunte');
    const modalVerMateria = document.getElementById('modalVerMateria');
    const modalVerFoto    = document.getElementById('modalVerFoto');

    let materiaActual      = null;
    let fotosDelTemaActual = [];
    let fotoIndexActual    = 0;

    // Navegar a Apuntes desde el menú
    document.querySelectorAll('.menu a').forEach(link => {
        link.addEventListener('click', async function(e) {
            if (this.textContent.trim().includes('Apuntes')) {
                e.preventDefault();
                ocultarTodasLasVistas();
                document.getElementById('vista-apuntes').classList.add('vista-activa');
                document.querySelector('.top-bar .greeting h1').textContent = 'Apuntes';
                await cargarMaterias();
            }
        });
    });


    //modal de confirmacion eliminar

function mostrarConfirmar(mensaje, onAceptar) {
    document.getElementById('confirmarMensaje').textContent = mensaje;
    const modal = document.getElementById('modalConfirmar');
    modal.classList.remove('oculto');

    const btnAceptar  = document.getElementById('confirmarAceptar');
    const btnCancelar = document.getElementById('confirmarCancelar');

    const limpiar = () => {
        modal.classList.add('oculto');
        btnAceptar.replaceWith(btnAceptar.cloneNode(true));
        btnCancelar.replaceWith(btnCancelar.cloneNode(true));
    };

    document.getElementById('confirmarAceptar').addEventListener('click', () => { limpiar(); onAceptar(); });
    document.getElementById('confirmarCancelar').addEventListener('click', limpiar);
    window.addEventListener('click', e => { if (e.target === modal) limpiar(); }, { once: true });
}

    // Cargar grid de materias
    async function cargarMaterias() {
        const { data, error } = await supabase.from('apuntes').select('materia');
        if (error) { console.error(error); return; }

        const conteo = {};
        data.forEach(r => { conteo[r.materia] = (conteo[r.materia] || 0) + 1; });
        const materias = Object.keys(conteo).sort();

        materiasGrid.innerHTML = '';

        if (!materias.length) {
            materiasGrid.innerHTML = `
                <div style="grid-column:1/-1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:60px 20px;color:var(--text-muted);text-align:center;">
                    <i class="fa-solid fa-book-open" style="font-size:3rem;opacity:0.3;"></i>
                    <p style="font-size:.9rem;max-width:260px;line-height:1.5;">Aún no tienes materias.<br>Crea una con el botón de arriba.</p>
                </div>`;
            return;
        }const iconos = ['fa-book-open','fa-folder','fa-graduation-cap','fa-bookmark','fa-file-lines','fa-school','fa-pen-ruler','fa-clipboard','fa-layer-group','fa-brain'];
materiasGrid.innerHTML = `
    <div class="materia-card materia-card-nueva" id="btnNuevaMateria">
        <div class="materia-card-icono" style="background:rgba(201,79,124,0.15);box-shadow:none;border:2px dashed var(--primary-pink);">
            <i class="fa-solid fa-plus" style="color:var(--primary-pink);"></i>
        </div>
        <span class="materia-card-nombre" style="color:var(--primary-pink);">Nueva materia</span>
    </div>`;

document.getElementById('btnNuevaMateria').addEventListener('click', () => {
    document.getElementById('nuevaMateriaInput').value = '';
    modalMateria.classList.remove('oculto');
    setTimeout(() => document.getElementById('nuevaMateriaInput').focus(), 100);
});
        materias.forEach((m, i) => {
            const card = document.createElement('div');
            card.className = 'materia-card';
            card.innerHTML = `
                <button class="materia-card-delete" title="Eliminar materia"><i class="fa-solid fa-trash-can"></i></button>
                <div class="materia-card-icono"><i class="fa-solid ${iconos[i % iconos.length]}"></i></div>
                <span class="materia-card-nombre">${m}</span>
                <span class="materia-card-count">${conteo[m]} foto${conteo[m] !== 1 ? 's' : ''}</span>
            `;
            card.addEventListener('click', (e) => { if (e.target.closest('.materia-card-delete')) return; abrirVerMateria(m); });
            card.querySelector('.materia-card-delete').addEventListener('click', async (e) => {
                e.stopPropagation();
              mostrarConfirmar(`¿Segura amorcites? vas a eliminar "${m}" y todas sus fotos`, () => eliminarMateria(m));
return; 
            });
            materiasGrid.appendChild(card);
        });
    }

    async function eliminarMateria(nombre) {
        const { data } = await supabase.from('apuntes').select('id, imagen_url').eq('materia', nombre);
        const paths = (data || []).map(a => { const url=a.imagen_url, b='/apuntes/'; return url.substring(url.indexOf(b)+b.length); });
        if (paths.length) await supabase.storage.from('apuntes').remove(paths);
        await supabase.from('apuntes').delete().eq('materia', nombre);
        mostrarNotificacion(`Materia "${nombre}" eliminada :<`);
        await cargarMaterias();
    }

    // Modal Nueva Materia
    btnNuevaMateria?.addEventListener('click', () => {
        document.getElementById('nuevaMateriaInput').value = '';
        modalMateria.classList.remove('oculto');
        setTimeout(() => document.getElementById('nuevaMateriaInput').focus(), 100);
    });
    document.getElementById('cerrarModalMateria')?.addEventListener('click', () => modalMateria.classList.add('oculto'));
    window.addEventListener('click', e => { if (e.target === modalMateria) modalMateria.classList.add('oculto'); });

    document.getElementById('btnConfirmarMateria')?.addEventListener('click', async () => {
        const nombre = document.getElementById('nuevaMateriaInput').value.trim();
        if (!nombre) { mostrarNotificacion('Ponle un nombre a la materia :)', 'error'); return; }
        const { data } = await supabase.from('apuntes').select('materia').eq('materia', nombre).limit(1);
        if (data && data.length) { mostrarNotificacion('Esa materia ya existe', 'error'); return; }
        materiaActual = nombre;
        modalMateria.classList.add('oculto');

        // Añadir tarjeta al grid sin recargar
        const iconos = ['fa-calculator','fa-flask','fa-globe','fa-book','fa-pen-nib','fa-microscope','fa-landmark','fa-code','fa-music','fa-palette'];
        const idx = materiasGrid.querySelectorAll('.materia-card').length;
        const card = document.createElement('div'); card.className = 'materia-card';
        card.innerHTML = `
            <button class="materia-card-delete"><i class="fa-solid fa-trash-can"></i></button>
            <div class="materia-card-icono"><i class="fa-solid ${iconos[idx % iconos.length]}"></i></div>
            <span class="materia-card-nombre">${nombre}</span>
            <span class="materia-card-count">0 fotos</span>
        `;
        card.addEventListener('click', (e) => { if (e.target.closest('.materia-card-delete')) return; abrirVerMateria(nombre); });
        card.querySelector('.materia-card-delete').addEventListener('click', async (e) => { e.stopPropagation(); mostrarConfirmar(`¿Eliminar la materia "${nombre}"?`, () => eliminarMateria(nombre));
return; });
        materiasGrid.querySelector('[style*="grid-column"]')?.remove(); // quita empty state
        materiasGrid.appendChild(card);

        mostrarNotificacion(`Materia "${nombre}" creada :3`);
        abrirVerMateria(nombre);
    });

    // Abrir modal de materia
    async function abrirVerMateria(nombre) {
        materiaActual = nombre;
        document.getElementById('verMateriaNombre').textContent = nombre;
        modalVerMateria.classList.remove('oculto');
        await cargarTemasDeMateria(nombre);
    }

    document.getElementById('cerrarVerMateria')?.addEventListener('click', () => { modalVerMateria.classList.add('oculto'); cargarMaterias(); });
    window.addEventListener('click', e => { if (e.target === modalVerMateria) { modalVerMateria.classList.add('oculto'); cargarMaterias(); } });

    // Cargar temas agrupados dentro de la materia
    async function cargarTemasDeMateria(materia) {
        const body = document.getElementById('verMateriaBody');
        body.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:30px;">Cargando...</p>';

        const { data, error } = await supabase.from('apuntes').select('id,titulo,imagen_url,created_at').eq('materia', materia).order('created_at', { ascending: true });
        if (error) { mostrarNotificacion('Error cargando apuntes', 'error'); return; }

        body.innerHTML = '';

        if (!data || !data.length) {
            body.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:40px;"><i class="fa-solid fa-image" style="font-size:2rem;opacity:0.3;display:block;margin-bottom:12px;"></i>No hay fotos aún. Sube la primera con el botón de arriba.</div>`;
            return;
        }

        // Agrupar por título
        const grupos = {};
        data.forEach(a => { if (!grupos[a.titulo]) grupos[a.titulo] = []; grupos[a.titulo].push(a); });

        Object.entries(grupos).forEach(([titulo, fotos]) => {
            const grupo = document.createElement('div'); grupo.className = 'tema-grupo';
            const header = document.createElement('div'); header.className = 'tema-grupo-header';
          header.innerHTML = `
    <span class="tema-grupo-titulo"><i class="fa-solid fa-images" style="color:var(--primary-pink);margin-right:8px;font-size:.8rem;"></i>${titulo}</span>
    <span class="tema-grupo-count">${fotos.length} foto${fotos.length !== 1 ? 's' : ''}</span>
    <i class="fa-solid fa-chevron-down tema-grupo-toggle"></i>
`;
            header.addEventListener('click', () => grupo.classList.toggle('collapsed'));

            const grid = document.createElement('div'); grid.className = 'tema-fotos-grid';
            grid.style.maxHeight = Math.ceil(fotos.length / 4) * 160 + 'px';

            fotos.forEach((foto, idx) => {
                const mini = document.createElement('div'); mini.className = 'apunte-miniatura';
                mini.innerHTML = `
                    <img src="${foto.imagen_url}" alt="${foto.titulo}" loading="lazy">
                    <button class="apunte-miniatura-delete"><i class="fa-solid fa-trash-can"></i></button>
                `;
                mini.addEventListener('click', (e) => { if (e.target.closest('.apunte-miniatura-delete')) return; abrirVisorFotos(fotos, idx, titulo); });
                mini.querySelector('.apunte-miniatura-delete').addEventListener('click', async (e) => { e.stopPropagation(); await eliminarFoto(foto); await cargarTemasDeMateria(materia); });
           grid.appendChild(mini);
}); // <-- aquí cierra el forEach

// Cuadro "+" FUERA del forEach
const btnAddFoto = document.createElement('div');
btnAddFoto.className = 'apunte-miniatura apunte-add-foto';
btnAddFoto.innerHTML = `<i class="fa-solid fa-plus"></i>`;
btnAddFoto.addEventListener('click', () => {
    resetModalApunte();
    document.getElementById('apunte-titulo').value = titulo;
    modalVerMateria.classList.add('oculto');
    modalApunte.classList.remove('oculto');
});
grid.appendChild(btnAddFoto);

        

            grupo.appendChild(header); grupo.appendChild(grid);
            body.appendChild(grupo);
        });
    }

    // Botón subir foto dentro del modal de materia
    document.getElementById('btnSubirEnMateria')?.addEventListener('click', () => {
    if (!materiaActual) return;
    modalVerMateria.classList.add('oculto');
    resetModalApunte();
    modalApunte.classList.remove('oculto');
});

    // Modal Subir Apunte
    document.getElementById('cerrarModalApunte')?.addEventListener('click', () => modalApunte.classList.add('oculto'));
    window.addEventListener('click', e => { if (e.target === modalApunte) modalApunte.classList.add('oculto'); });

    function resetModalApunte() {
        document.getElementById('apunte-titulo').value = '';
        document.getElementById('apunteFile').value = '';
        document.getElementById('apuntePreview').classList.add('oculto');
        document.getElementById('dropZoneContenido').style.display = 'flex';
        document.getElementById('apunteProgress').classList.add('oculto');
        document.getElementById('apunteProgressBar').style.width = '0%';
        document.getElementById('btnGuardarApunte').disabled = true;
        const mp = document.getElementById('apunteMultiPreview');
        mp.innerHTML = ''; mp.style.display = 'none';
        _archivosSeleccionados = [];
    }

    let _archivosSeleccionados = [];
    const dropZone    = document.getElementById('apunteDropZone');
    const fileInput   = document.getElementById('apunteFile');
    const preview     = document.getElementById('apuntePreview');
    const dropContent = document.getElementById('dropZoneContenido');
    const multiPrev   = document.getElementById('apunteMultiPreview');

    dropZone?.addEventListener('click', () => fileInput.click());
    dropZone?.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-active'); });
    dropZone?.addEventListener('dragleave', () => dropZone.classList.remove('drag-active'));
    dropZone?.addEventListener('drop', e => { e.preventDefault(); dropZone.classList.remove('drag-active'); const files=[...e.dataTransfer.files].filter(f=>f.type.startsWith('image/')); if(files.length)procesarArchivos(files); });
    fileInput?.addEventListener('change', () => { if(fileInput.files.length)procesarArchivos([...fileInput.files]); });

    function procesarArchivos(files) {
        _archivosSeleccionados = files;
        if (files.length === 1) {
            const r = new FileReader(); r.onload = e => { preview.src=e.target.result; preview.classList.remove('oculto'); dropContent.style.display='none'; multiPrev.style.display='none'; }; r.readAsDataURL(files[0]);
        } else {
            preview.classList.add('oculto'); dropContent.style.display='none'; multiPrev.style.display='flex'; multiPrev.innerHTML='';
            files.forEach(f => { const r=new FileReader(); r.onload=e=>{const img=document.createElement('img');img.src=e.target.result;img.style.cssText='width:60px;height:60px;object-fit:cover;border-radius:8px;border:2px solid var(--primary-pink);';multiPrev.appendChild(img);}; r.readAsDataURL(f); });
        }
        document.getElementById('btnGuardarApunte').disabled = false;
    }

    document.getElementById('formApunte')?.addEventListener('submit', async e => {
        e.preventDefault();
        const titulo = document.getElementById('apunte-titulo').value.trim();
        if (!titulo) { mostrarNotificacion('Ponle un título al apunte', 'error'); return; }
        if (!_archivosSeleccionados.length) { mostrarNotificacion('Selecciona al menos una imagen', 'error'); return; }
        const pw=document.getElementById('apunteProgress'), pb=document.getElementById('apunteProgressBar'), pt=document.getElementById('apunteProgressTxt');
        pw.classList.remove('oculto'); pb.style.width='0%';
        document.getElementById('btnGuardarApunte').disabled = true;
        try {
            const total = _archivosSeleccionados.length;
            for (let i = 0; i < total; i++) {
                const file = _archivosSeleccionados[i];
                pt.textContent = `Subiendo ${i+1} de ${total}...`;
                pb.style.width = `${((i/total)*80)}%`;
                const ext = file.name.split('.').pop();
                const fileName = `${materiaActual}/${Date.now()}_${i}.${ext}`;
                const { error: ue } = await supabase.storage.from('apuntes').upload(fileName, file, { cacheControl:'3600', upsert:false });
                if (ue) throw ue;
                const { data: ud } = supabase.storage.from('apuntes').getPublicUrl(fileName);
                const { error: de } = await supabase.from('apuntes').insert([{ titulo, materia: materiaActual, imagen_url: ud.publicUrl }]);
                if (de) throw de;
            }
            pb.style.width='100%'; pt.textContent='¡Listo!';
            setTimeout(async () => {
    modalApunte.classList.add('oculto');
    mostrarNotificacion(`${total} foto${total!==1?'s':''} subida${total!==1?'s':''} :3`);
    await cargarTemasDeMateria(materiaActual);
    await cargarMaterias();
    modalVerMateria.classList.remove('oculto');
}, 500);
        } catch(err) { console.error(err); mostrarNotificacion('Error subiendo el apunte :<','error'); pw.classList.add('oculto'); document.getElementById('btnGuardarApunte').disabled=false; }
    });

    async function eliminarFoto(apunte) {
        const url=apunte.imagen_url, b='/apuntes/';
        const filePath=url.substring(url.indexOf(b)+b.length);
        await supabase.storage.from('apuntes').remove([filePath]);
        const { error } = await supabase.from('apuntes').delete().eq('id', apunte.id);
        if (error) { mostrarNotificacion('Error eliminando foto','error'); return; }
        mostrarNotificacion('Foto eliminada');
    }

    // Visor de fotos con navegación
    function abrirVisorFotos(fotos, indexInicial, titulo) {
        fotosDelTemaActual = fotos; fotoIndexActual = indexInicial;
        document.getElementById('verFotoTitulo').textContent = titulo;
        actualizarVisorFoto();
        modalVerFoto.classList.remove('oculto');
    }

    function actualizarVisorFoto() {
        const foto = fotosDelTemaActual[fotoIndexActual], total = fotosDelTemaActual.length;
        document.getElementById('verFotoImg').src = foto.imagen_url;
        document.getElementById('verFotoContador').textContent = total > 1 ? `${fotoIndexActual+1} / ${total}` : '';
        document.getElementById('verFotoPrev').disabled = fotoIndexActual === 0;
        document.getElementById('verFotoNext').disabled = fotoIndexActual === total-1;
    }

    document.getElementById('cerrarVerFoto')?.addEventListener('click', () => modalVerFoto.classList.add('oculto'));
    window.addEventListener('click', e => { if (e.target === modalVerFoto) modalVerFoto.classList.add('oculto'); });
    document.getElementById('verFotoPrev')?.addEventListener('click', () => { if(fotoIndexActual>0){fotoIndexActual--;actualizarVisorFoto();} });
    document.getElementById('verFotoNext')?.addEventListener('click', () => { if(fotoIndexActual<fotosDelTemaActual.length-1){fotoIndexActual++;actualizarVisorFoto();} });

    document.addEventListener('keydown', e => {
        if (modalVerFoto.classList.contains('oculto')) return;
        if (e.key==='ArrowLeft'  && fotoIndexActual>0) { fotoIndexActual--; actualizarVisorFoto(); }
        if (e.key==='ArrowRight' && fotoIndexActual<fotosDelTemaActual.length-1) { fotoIndexActual++; actualizarVisorFoto(); }
        if (e.key==='Escape') modalVerFoto.classList.add('oculto');
    });

    document.getElementById('btnEliminarFoto')?.addEventListener('click', async () => {
        const foto = fotosDelTemaActual[fotoIndexActual]; if (!foto) return;
        await eliminarFoto(foto);
        fotosDelTemaActual.splice(fotoIndexActual, 1);
        if (!fotosDelTemaActual.length) { modalVerFoto.classList.add('oculto'); await cargarTemasDeMateria(materiaActual); return; }
        if (fotoIndexActual >= fotosDelTemaActual.length) fotoIndexActual--;
        actualizarVisorFoto();
        await cargarTemasDeMateria(materiaActual);
    });



    /* =========================================
       16. VISTA CONFIGURACIONES
       Añade esto antes de la llave de cierre final
       ========================================= */

    const vistaConfig = document.getElementById('vista-configuraciones');

    // Navegar a Configuraciones
document.querySelectorAll('.menu a').forEach(link => {
    link.addEventListener('click', function(e) {
        if (this.textContent.trim().includes('Configuraciones')) {
            e.preventDefault();
            ocultarTodasLasVistas();
            vistaConfig.classList.add('vista-activa');
            document.querySelector('.top-bar .greeting h1').textContent = 'Configuraciones';
            iniciarConfig();
        } else if (this.textContent.trim().includes('Sugerencias')) {
            e.preventDefault();
            ocultarTodasLasVistas();
            document.getElementById('vista-sugerencias').classList.add('vista-activa');
            document.querySelector('.top-bar .greeting h1').textContent = 'Sugerencias';
        }
    });
});

    // También añade vistaConfig al helper ocultarTodasLasVistas
    // Busca la función ocultarTodasLasVistas y añade esta línea:
    // vistaConfig.classList.remove('vista-activa');

    /* --- TEMAS --- */
    const TEMAS = {
        'noche-oscura': '',          // sin clase extra, es el default
        'aurora-boreal': 'tema-aurora-boreal',
        'soleado': 'tema-soleado',
        'oceano': 'tema-oceano',
        'monocromo': 'tema-monocromo'
    };

    let temaSeleccionado = localStorage.getItem('tema') || 'noche-oscura';
    let temaPreview      = temaSeleccionado; // el que se ve en el preview antes de aceptar

    function aplicarTema(nombreTema, guardar = false) {
        // Quitamos todas las clases de tema del body
        Object.values(TEMAS).forEach(cls => { if (cls) body.classList.remove(cls); });
        // light-mode no lo tocamos
        const cls = TEMAS[nombreTema];
        if (cls) body.classList.add(cls);
        if (guardar) {
            localStorage.setItem('tema', nombreTema);
            temaSeleccionado = nombreTema;
        }
    }

    // Aplicar tema al cargar la página
    aplicarTema(temaSeleccionado);

    function iniciarConfig() {
        // Marcar el tema activo
        temaPreview = temaSeleccionado;
        actualizarTarjetasTema(temaSeleccionado);

        // Nombre actual
        const nombreGuardado = localStorage.getItem('nombreUsuario');
        if (nombreGuardado) {
            document.getElementById('configNombreActual').textContent = nombreGuardado;
        }

        // Foto actual
        const fotoGuardada = localStorage.getItem('fotoUsuario');
        if (fotoGuardada) {
            document.getElementById('configFotoPreview').src = fotoGuardada;
        }
    }

    function actualizarTarjetasTema(nombreTema) {
        document.querySelectorAll('.tema-card').forEach(card => {
            card.classList.toggle('active', card.dataset.tema === nombreTema);
        });
    }

    // Click en tarjeta de tema → preview inmediato sin guardar
    document.querySelectorAll('.tema-card').forEach(card => {
        card.addEventListener('click', () => {
            temaPreview = card.dataset.tema;
            actualizarTarjetasTema(temaPreview);
            aplicarTema(temaPreview, false); // aplica visualmente pero no guarda
        });
    });

    // Botón Aceptar → guarda el tema
    document.getElementById('btnAceptarTema')?.addEventListener('click', () => {
        aplicarTema(temaPreview, true);
        mostrarNotificacion('Tema guardado :3');
    });

    /* --- FOTO DE PERFIL --- */
    const configFotoInput   = document.getElementById('configFotoInput');
    const configFotoPreview = document.getElementById('configFotoPreview');
    let fotoBase64Nueva     = null;

    document.getElementById('btnCambiarFoto')?.addEventListener('click', () => configFotoInput.click());
    document.getElementById('configFotoPreview')?.addEventListener('click', () => configFotoInput.click());

    configFotoInput?.addEventListener('change', () => {
        const file = configFotoInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            fotoBase64Nueva = e.target.result;
            configFotoPreview.src = fotoBase64Nueva;
            document.getElementById('btnGuardarFoto').disabled = false;
        };
        reader.readAsDataURL(file);
    });

    document.getElementById('btnGuardarFoto')?.addEventListener('click', () => {
        if (!fotoBase64Nueva) return;
        localStorage.setItem('fotoUsuario', fotoBase64Nueva);
        // Actualizar la foto en el sidebar
        document.querySelector('.user-profile img').src = fotoBase64Nueva;
        mostrarNotificacion('Foto actualizada :3');
        document.getElementById('btnGuardarFoto').disabled = true;
        fotoBase64Nueva = null;
    });

    /* --- NOMBRE --- */
    document.getElementById('btnGuardarNombre')?.addEventListener('click', () => {
        const nuevoNombre = document.getElementById('configNombreInput').value.trim();
        if (!nuevoNombre) { mostrarNotificacion('Escribe un nombre primero', 'error'); return; }
        localStorage.setItem('nombreUsuario', nuevoNombre);
        // Actualizar en sidebar y en la config
        document.querySelector('.user-info h3').textContent = nuevoNombre;
        document.getElementById('configNombreActual').textContent = nuevoNombre;
        document.getElementById('configNombreInput').value = '';
        mostrarNotificacion('Nombre actualizado :3');
    });

    /* --- CARGAR PREFERENCIAS AL INICIO --- */
    (function cargarPreferenciasGuardadas() {
        const fotoGuardada = localStorage.getItem('fotoUsuario');
        if (fotoGuardada) {
            document.querySelector('.user-profile img').src = fotoGuardada;
        }
        const nombreGuardado = localStorage.getItem('nombreUsuario');
        if (nombreGuardado) {
            document.querySelector('.user-info h3').textContent = nombreGuardado;
        }
    })();



        /* =========================================
       17. VISTA SUGERENCIAS
       Añade esto antes de la llave de cierre final
       ========================================= */

    const vistaSugerencias = document.getElementById('vista-sugerencias');

    // Añade vistaSugerencias a ocultarTodasLasVistas:
    // document.getElementById('vista-sugerencias')?.classList.remove('vista-activa');

    // Navegar a Sugerencias desde el menú unificado
    // En tu navegador unificado añade este bloque:
    // } else if (texto.includes('Sugerencias')) {
    //     e.preventDefault();
    //     ocultarTodasLasVistas();
    //     vistaSugerencias.classList.add('vista-activa');
    //     document.querySelector('.top-bar .greeting h1').textContent = 'Sugerencias';
    // }

    // Envío del formulario
document.getElementById('formSugerencias')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nombre  = document.getElementById('sug-nombre').value.trim();
    const correo  = document.getElementById('sug-correo').value.trim();
    const asunto  = document.getElementById('sug-asunto').value.trim();
    const mensaje = document.getElementById('sug-mensaje').value.trim();

    if (!nombre || !correo || !asunto || !mensaje) {
        mostrarNotificacion('Completa todos los campos', 'error');
        return;
    }

    const btnEnviar = document.querySelector('.sugerencias-btn-enviar');
    btnEnviar.disabled = true;
    btnEnviar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';

try {
    const res = await fetch('https://formspree.io/f/xgodqyek', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, email: correo, asunto, message: mensaje })
    });

    if (res.ok) {
        mostrarNotificacion('Sugerencia enviada :3');
        document.getElementById('formSugerencias').reset();
    } else {
        throw new Error('Error del servidor');
    }

} catch (err) {
    console.error(err);
    mostrarNotificacion('Error al enviar, intenta de nuevo', 'error');
} finally {
        btnEnviar.disabled = false;
        btnEnviar.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Enviar';
    }
});

       });