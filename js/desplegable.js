function toggleContent(contentId, btnId) {
    var content = document.getElementById(contentId);
    var button = document.getElementById(btnId);
    var icon = button.querySelector('i');
    var container = content.closest('.meningitis-bacteriana-contenedor');

    if (content.classList.contains('ocultar')) {
        content.classList.remove('ocultar');
        content.classList.add('mostrar-contenido');
        container.classList.add('mostrar-contenido');
        icon.classList.remove('fa-plus');
        icon.classList.add('fa-minus');
    } else {
        content.classList.add('ocultar');
        content.classList.remove('mostrar-contenido');
        container.classList.remove('mostrar-contenido');
        icon.classList.remove('fa-minus');
        icon.classList.add('fa-plus');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.btn').forEach(button => {
        button.addEventListener('click', function(event) {
            event.stopPropagation();
            let contentId = button.closest('.titulo').getAttribute('onclick').match(/'(.*?)'/)[1];
            toggleContent(contentId, button.id);
        });
    });
});
