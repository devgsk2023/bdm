document.addEventListener("DOMContentLoaded", function() {
    // Manejo del menú toggle
    document.querySelector('.menu-toggle').addEventListener('click', () => {
        document.querySelector('.menu').classList.toggle('show');
    });

    // Manejo del menú pop-up
    const menuToggle = document.querySelector(".menu-toggle");
    const menuPopup = document.getElementById("menu-popup");
    const closeButton = document.querySelector(".close-button");

    menuToggle.addEventListener("click", function() {
        menuPopup.style.display = "block";
    });

    closeButton.addEventListener("click", function() {
        menuPopup.style.display = "none";
    });

    window.addEventListener("click", function(event) {
        if (event.target === menuPopup) {
            menuPopup.style.display = "none";
        }
    });

    // Manejo de submenús y barra de progreso
    const menuItems = document.querySelectorAll(".menu-activo > li");
    const progressBar = document.querySelector(".progress-bar");
    const submenuItems = document.querySelectorAll(".submenu li");
    const imageContainer = document.querySelector(".image-container");
    const menuImage = document.getElementById("menu-image");

    menuItems.forEach(item => {
        item.addEventListener("mouseenter", function() {
            const submenu = this.querySelector(".submenu");
            if (submenu) {
                submenu.style.display = "flex";
            }

            const itemRect = item.getBoundingClientRect();
            const containerRect = item.parentElement.getBoundingClientRect();
            progressBar.style.width = `${itemRect.width}px`;
            progressBar.style.left = `${itemRect.left - containerRect.left}px`;
        });

        item.addEventListener("mouseleave", function() {
            const submenu = this.querySelector(".submenu");
            if (submenu) {
                submenu.style.display = "none";
            }
            progressBar.style.width = '0';
        });
    });

    submenuItems.forEach(item => {
        item.addEventListener("mouseenter", function() {
            const imageUrl = this.getAttribute("data-image");
            if (imageUrl) {
                menuImage.src = imageUrl;
                imageContainer.style.display = "block";
            }
        });

        item.addEventListener("mouseleave", function() {
            imageContainer.style.display = "none";
        });
    });
});
