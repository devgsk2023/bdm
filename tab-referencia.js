function abrirTab() {
    var contenido = document.getElementById('tab-content');
    var icono = document.getElementById('tab-icon');
    
    if (contenido.style.display === 'none' || contenido.style.display === '') {
        contenido.style.display = 'block';
        icono.className = 'fas fa-minus';
    } else {
        contenido.style.display = 'none';
        icono.className = 'fas fa-plus';
    }
}