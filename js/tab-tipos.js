document.addEventListener('DOMContentLoaded', function() {
    // Slider functionality
    const tabsContainer = document.querySelector('.vacunas-tabs');
    let isDown = false;
    let startX;
    let scrollLeft;

    tabsContainer.addEventListener('mousedown', (e) => {
        isDown = true;
        startX = e.pageX - tabsContainer.offsetLeft;
        scrollLeft = tabsContainer.scrollLeft;
    });

    tabsContainer.addEventListener('mouseleave', () => {
        isDown = false;
    });

    tabsContainer.addEventListener('mouseup', () => {
        isDown = false;
    });

    tabsContainer.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - tabsContainer.offsetLeft;
        const walk = (x - startX) * 3; // Control the scroll speed
        tabsContainer.scrollLeft = scrollLeft - walk;
    });

    // Tabs switching functionality
    const li = document.querySelectorAll('.li');
    const bloques = document.querySelectorAll('.bloque');
    const subcontenedor = document.querySelector('.subcontenedor');

    li.forEach((cadaLi, i) => {
        cadaLi.addEventListener('click', () => {
            // Remove 'activo' class from all tabs and blocks
            li.forEach((cadaLi, j) => {
                cadaLi.classList.remove('activo');
                bloques[j].classList.remove('activo');
            });

            // Add 'activo' class to the clicked tab and corresponding block
            cadaLi.classList.add('activo');
            bloques[i].classList.add('activo');

            // Adjust the height of the subcontenedor based on the active block
            ajustarAlturaSubcontenedor();
        });
    });

    // Adjust the height of the subcontenedor when the page loads with the first block active
    window.addEventListener('load', ajustarAlturaSubcontenedor);

    // Function to adjust the height of the subcontenedor
    function ajustarAlturaSubcontenedor() {
        // Use media query to detect small devices
        if (window.matchMedia("(max-width: 1000px)").matches) {
            subcontenedor.style.height = 'auto';
        } else {
            const bloqueActivo = document.querySelector('.bloque.activo');
            if (bloqueActivo) {
                subcontenedor.style.height = `${bloqueActivo.offsetHeight}px`;
            }
        }
    }
});

