document.addEventListener("DOMContentLoaded", () => {

    // =========================================
    // 1. SLIDER (Carrusel de imágenes)
    // =========================================
    const track = document.getElementById('track');
    const dots = document.querySelectorAll('.dot');

    if(track && dots.length > 0){
        const totalSlides = dots.length;
        let currentSlide = 0;
        let slideInterval;

        function goToSlide(index) {
            if (index < 0) index = totalSlides - 1;
            if (index >= totalSlides) index = 0;

            const percentage = (index * (100 / totalSlides));
            track.style.transform = `translateX(-${percentage}%)`;

            currentSlide = index;
            updateDots();
        }

        function updateDots() {
            dots.forEach(dot => dot.classList.remove('active'));
            dots[currentSlide].classList.add('active');
        }

        function nextSlide() {
            goToSlide(currentSlide + 1);
        }

        function startAutoPlay() {
            slideInterval = setInterval(nextSlide, 3000);
        }

        // Iniciar Slider
        startAutoPlay();
    } 

  // =========================================
// 2. LOGICA DEL FORMULARIO (LOGIN)
// =========================================
const form = document.getElementById("miFormularioLogin");

if (form) {
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const terms = document.getElementById('terms');
        if (!terms.checked) {
            mostrarAlerta("Aja amorcito, acepta los terms of service");
            terms.closest('.checkbox-container').style.animation = 'shake 0.4s ease';
            setTimeout(() => {
                terms.closest('.checkbox-container').style.animation = '';
            }, 400);
            return;
        }

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        try {
            // Importamos el cliente de supabase
            const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm");
            const supabase = createClient(
                "https://wwenifzptzjzonstlkec.supabase.co",
                "sb_publishable_hS0YEGX2SRAzWENbjxZ62A_DWzc2Sy9"
            );

            // Buscamos el usuario por correo
            const { data: usuarios, error } = await supabase
                .from("users")
                .select()
                .eq("correo", email);

            if (error || !usuarios || usuarios.length === 0) {
                mostrarAlerta("Correo no encontrado");
                return;
            }

            const usuario = usuarios[0];

            // Verificamos el password con SHA1 (igual que tu PHP)
            const encoder = new TextEncoder();
            const hashBuffer = await crypto.subtle.digest("SHA-1", encoder.encode(password));
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            const hashMinusBuffer = await crypto.subtle.digest("SHA-1", encoder.encode(password.toLowerCase()));
            const hashMinusArray = Array.from(new Uint8Array(hashMinusBuffer));
            const hashMinusHex = hashMinusArray.map(b => b.toString(16).padStart(2, '0')).join('');

            if (usuario.password !== hashHex && usuario.password !== hashMinusHex) {
                mostrarAlerta("Contraseña incorrecta");
                return;
            }

            // Guardamos sesión en localStorage (reemplaza $_SESSION de PHP)
            localStorage.setItem("usuario", usuario.nombre);
            localStorage.setItem("id", usuario.id_users);

            window.location.href = "12381792387192.html";

        } catch (err) {
            console.error(err);
            mostrarAlerta("Error inesperado en la conexión");
        }
    });
}

    // =========================================
    // 3. LOGICA DEL MODAL (TÉRMINOS)
    // =========================================
    const modal = document.getElementById('termsModal');
    const btnOpen = document.getElementById('termsLink'); // El enlace "terms of service"
    const btnClose = document.querySelector('.close-btn'); // La X
    const btnAccept = document.getElementById('acceptBtn'); // Botón Entendido

    // Función para cerrar el modal
    const closeModal = () => {
        modal.classList.remove('active');
    };

    // ABRIR MODAL
    if (btnOpen) {
        btnOpen.addEventListener('click', (e) => {
            e.preventDefault();
            modal.classList.add('active');
        });
    }

    // CERRAR CON LA X
    if (btnClose) {
        btnClose.addEventListener('click', closeModal);
    }
    
    // CERRAR CON EL BOTÓN "ENTENDIDO" (CORREGIDO AQUÍ)
    if (btnAccept) {
        btnAccept.addEventListener('click', (e) => {
            e.preventDefault(); // <--- ESTO EVITA QUE ENVÍE EL FORMULARIO DE LOGIN
            closeModal();
        });
    }

    // CERRAR CLICK AFUERA
    window.addEventListener('click', (e) => {
        if (e.target == modal) {
            closeModal();
        }
    });

});

// =========================================
// FUNCIÓN GLOBAL DE ALERTA
// =========================================
function mostrarAlerta(msg){
    let alert = document.querySelector(".custom-alert");

    if(!alert){
        alert = document.createElement("div");
        alert.className = "custom-alert";
        document.body.appendChild(alert);
    }

    alert.textContent = msg;
    alert.classList.add("show");

    setTimeout(() => {
        alert.classList.remove("show");
    }, 4000);
}