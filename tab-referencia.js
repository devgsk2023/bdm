function abrirTab() {
    var contenido = document.getElementById('tab-content');
    var icono = document.getElementById('tab-icon');
    
    if (contenido.classList.contains('open')) {
        contenido.classList.remove('open');
        icono.className = 'fas fa-plus';
    } else {
        contenido.classList.add('open');
        icono.className = 'fas fa-minus';
    }
}
