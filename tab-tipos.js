

const li = document.querySelectorAll('.li');
const bloques = document.querySelectorAll('.bloque');
const subcontenedor = document.querySelector('.subcontenedor');

li.forEach((cadaLi, i) => {
    cadaLi.addEventListener('click', () => {
        // Remover clases 'activo' de todos los tabs y bloques
        li.forEach((cadaLi, j) => {
            cadaLi.classList.remove('activo');
            bloques[j].classList.remove('activo');
        });

        // Añadir clase 'activo' al tab y bloque correspondiente
        cadaLi.classList.add('activo');
        bloques[i].classList.add('activo');

        // Ajustar la altura del subcontenedor basado en el bloque activo
        const bloqueActivo = bloques[i];
        const alturaContenido = bloqueActivo.scrollHeight;
        subcontenedor.style.height = `${alturaContenido}px`;
    });
});

// Ajustar la altura del subcontenedor al cargar la página con el primer bloque activo
window.addEventListener('load', () => {
    const bloqueActivo = document.querySelector('.bloque.activo');
    if (bloqueActivo) {
        subcontenedor.style.height = `${bloqueActivo.scrollHeight}px`;
    }
});
