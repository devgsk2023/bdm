document.addEventListener("DOMContentLoaded", function () {
    // Manejo del menú toggle
    document.querySelector('.menu-toggle').addEventListener('click', () => {
        document.querySelector('.menu').classList.toggle('show');
    });

    // Manejo del menú pop-up
    const menuToggle = document.querySelector(".menu-toggle");
    const menuPopup = document.getElementById("menu-popup");
    const closeButton = document.querySelector(".close-button");

    menuToggle.addEventListener("click", function () {
        if (menuPopup.classList.contains("hidden")) {
            menuPopup.classList.remove("hidden");
            menuPopup.style.display = "block";
        }
        menuPopup.style.display = "block";
    });

    closeButton.addEventListener("click", function () {
        menuPopup.classList.add("hidden");
        setTimeout(function () {
            menuPopup.style.display = "none";
        }, 500);
        
    });

    window.addEventListener("click", function (event) {
        if (event.target === menuPopup) {
            menuPopup.classList.add("hidden");
            setTimeout(function () {
                menuPopup.style.display = "none";
            }, 500);
        }
    });

    // Manejo de submenús y barra de progreso
    const menuItems = document.querySelectorAll(".menu-activo > li");
    const progressBar = document.querySelector(".progress-bar");
    const submenuItems = document.querySelectorAll(".submenu li");
    const imageContainer = document.querySelector(".image-container");
    const menuImage = document.getElementById("menu-image");
    const arrowDown = document.querySelector(".fa-chevron-down");

    menuItems.forEach(item => {
        item.addEventListener("mouseenter", function () {
            const submenu = this.querySelector(".submenu");
            if (submenu) {
                submenu.style.display = "flex";
            }

            const itemRect = item.getBoundingClientRect();
            const containerRect = item.parentElement.getBoundingClientRect();
            progressBar.style.width = `${itemRect.width}px`;
            progressBar.style.left = `${itemRect.left - containerRect.left}px`;
        });

        item.addEventListener("mouseleave", function () {
            const submenu = this.querySelector(".submenu");
            if (submenu) {
                submenu.style.display = "none";
            }
            progressBar.style.width = '0';
        });

        item.addEventListener("click", function () {
            const submenu = this.querySelector(".submenu");
            if (submenu) {
                submenu.style.display = (submenu.style.display === "flex") ? "none" : "flex";
            }
        });
    });

    submenuItems.forEach(item => {
        item.addEventListener("mouseenter", function () {
            const imageUrl = this.getAttribute("data-image");
            if (imageUrl) {
                menuImage.src = imageUrl;
                imageContainer.style.display = "block";
            }
        });

        item.addEventListener("mouseleave", function () {
            imageContainer.style.display = "none";
        });
    });

    let descargarPDF = document.getElementById("descargar");
    descargarPDF.addEventListener("click", function () {
        const link = document.createElement('a');
        link.href = '../wp-content/uploads/2024/02/Calendario_Vacunacion.pdf';
        link.download = 'Calendario_Vacunacion.pdf';
        link.click();
        document.body.removeChild(link);
    });
});


// ruleta javascript

document.addEventListener("DOMContentLoaded", function () {
    const items = document.querySelectorAll('.container-ruleta div');
    const bloques = document.querySelectorAll('.bloque');
    const subcontenedor = document.querySelector('.subcontenedor');

    // Mostrar solo el primer bloque como predeterminado
    if (bloques.length > 0) {
        bloques[0].classList.add('activo');
        items[4].classList.add('active');
    }

    items.forEach((item) => {
        item.addEventListener('mouseover', () => {
            items.forEach(i => i.classList.remove('active'));

            // Añadir la clase 'active' al elemento clickeado
            item.classList.add('active');
            bloques.forEach((bloque) => {
                bloque.classList.remove('activo');
                bloque.style.opacity = 0;
                bloque.style.visibility = 'hidden';
                bloque.style.position = 'absolute'; // Asegurar que los bloques ocultos no afectan el layout
            });

            // Mostrar el bloque correspondiente
            const targetId = item.getAttribute('data-target');
            const targetBlock = document.getElementById(targetId);
            if (targetBlock) {
                targetBlock.classList.add('activo');
                targetBlock.style.opacity = 1;
                targetBlock.style.visibility = 'visible';
                targetBlock.style.position = 'relative'; // Volver a ajustar la posición del bloque visible
                // Ajustar la altura del subcontenedor basado en el bloque activo
                subcontenedor.style.height = 'auto'; // Permitir altura automática primero
                const height = targetBlock.scrollHeight;
                subcontenedor.style.height = `${height}px`; // Luego, ajustar a la altura del bloque activo
            }
        });
    });

    // Ajustar la altura del subcontenedor al cargar la página con el primer bloque activo
    window.addEventListener('load', () => {
        if (bloques.length > 0) {
            const bloqueActivo = bloques[0];
            subcontenedor.style.height = `${bloqueActivo.scrollHeight}px`;
        }
    });
});



document.addEventListener("DOMContentLoaded", function () {
    // Toggle menu on mobile
    const menuToggle = document.querySelector('.menu-toggle');
    const menu = document.querySelector('.menu');
    const closeButton = document.querySelector('.menu-close');

    menuToggle.addEventListener('click', () => {
        menu.classList.toggle('open');
    });

    closeButton.addEventListener('click', () => {
        menu.classList.remove('open');
    });

    // Close the menu when clicking outside of it
    window.addEventListener('click', function (event) {
        if (!menu.contains(event.target) && !menuToggle.contains(event.target)) {
            menu.classList.remove('open');
        }
    });


});

// Mostrar/ocultar el texto en el acordeón
document.addEventListener("DOMContentLoaded", function () {
    // Mostrar/ocultar el texto en el acordeón
    const accordionButtons = document.querySelectorAll('.accordion-button');
    accordionButtons.forEach(button => {
        button.addEventListener('click', function () {
            const parent = button.closest('.accordion-item');
            const hiddenText = parent.querySelector('.hidden-text');
            
            if (button.classList.contains('collapsed')) {
                hiddenText.style.display = 'none';
            } else {
                hiddenText.style.display = 'block';
            }
        });
    });
});



//boton volver arriba

$(document).ready(function(){

	$('.ir-arriba').click(function(){
		$('body, html').animate({
			scrollTop: '0px'
		}, 300);
	});

	$(window).scroll(function(){
		// Cambia el valor 500 para que el botón aparezca después de scrollear 500 píxeles
		if( $(this).scrollTop() > 200 ){
			$('.ir-arriba').slideDown(300);
		} else {
			$('.ir-arriba').slideUp(300);
		}
	});

});




//menu sticky

window.addEventListener('scroll', function() {
    var header = document.querySelector('.menu-sticky-trigger');
    var menuIcon = document.querySelector('button.menu-toggle'); // Selecciona el ícono del menú
    
    if (window.scrollY > 1) { // Cambiado a 1 píxel
        header.style.position = 'fixed';
        header.style.top = '0';
        header.style.width = '100%';
        header.style.padding = '1% 5%';
        header.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
        header.style.boxSizing = 'border-box'; // Añade box-sizing: border-box
        header.style.zIndex = '999'; // Añade z-index: 999
        header.style.boxShadow = '0px 4px 10px rgba(0, 0, 0, 0.05)'; // Añade sombra
        menuIcon.style.color = '#9794EB'; // Cambia el color del ícono del menú
    } else {
        header.style.position = 'sticky';
        header.style.padding = '0'; // Restablece padding cuando vuelve a ser sticky
        header.style.backgroundColor = 'transparent'; // Restablece fondo
        header.style.boxSizing = ''; // Restablece box-sizing a su valor original
        header.style.zIndex = ''; // Restablece z-index a su valor original
        header.style.boxShadow = ''; // Elimina la sombra
        menuIcon.style.color = ''; // Restablece el color original del ícono del menú
    }
});

//arrows para cambiar de pagina

// window.addEventListener('scroll', function() {
//     const volverAvanzar = document.querySelector('.volver-avanzar');

//     if (window.scrollY > (window.innerHeight / 2)) {
//         volverAvanzar.classList.add('visible');
//     } else {
//         volverAvanzar.classList.remove('visible');
//     }
// });




 
// pop-up
document.addEventListener('DOMContentLoaded', function() {
    const triggerElement = document.getElementById('prevencion'); 
    const modal = new bootstrap.Modal(document.getElementById('exampleModalToggle'));

    function checkVisibility() {
        const rect = triggerElement.getBoundingClientRect();
        const isFullyVisible = rect.top <= window.innerHeight && rect.bottom >= 0;

        // Mostrar modal solo si la sección es visible en la pantalla
        if (isFullyVisible) {
            modal.show();
            window.removeEventListener('scroll', checkVisibility); // Evita que se vuelva a mostrar el modal
        }
    }

    window.addEventListener('scroll', checkVisibility);
});
