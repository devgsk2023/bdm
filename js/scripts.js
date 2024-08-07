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
    const arrowDown = document.querySelector(".fa-chevron-down")
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
        link.href = '../wp-content/uploads/2024/02/CNdV2024_H32x24lunN.pdf';
        link.download = 'CNdV2024_H32x24lunN.pdf';
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


//los 4 botones del home en el banner 







