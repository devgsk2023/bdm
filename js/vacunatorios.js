// Clase para manejar los vacunatorios
class VacunatoriosMap {
    constructor() {
        this.map = null;
        this.markers = [];
        this.vacunatorios = [];
        this.geocoder = null;
        this.bounds = null;
        this.infoWindow = null;
        this.filters = {
            provincia: '',
            localidad: '',
            apVacuna: false,
            apVacunaMenor: false
        };
    }

    // Inicializar el mapa
    async init() {
        // Inicializar el mapa centrado en Argentina
        this.map = new google.maps.Map(document.getElementById('map'), {
            center: { lat: -38.416097, lng: -63.616672 },
            zoom: 4
        });
        
        this.geocoder = new google.maps.Geocoder();
        this.bounds = new google.maps.LatLngBounds();
        this.infoWindow = new google.maps.InfoWindow();
        
        // Cargar los datos de vacunatorios
        await this.loadVacunatorios();
        
        // Inicializar filtros
        this.initFilters();
        
        // Agregar evento para la búsqueda
        document.getElementById('searchInput').addEventListener('input', () => {
            this.filterVacunatorios();
        });
    }

    // Cargar los datos del CSV
    async loadVacunatorios() {
        try {
            const response = await fetch('/vacunas.csv');
            const data = await response.text();
            
            // Parsear CSV
            const rows = data.split('\n').slice(1); // Ignorar header
            this.vacunatorios = rows.map(row => {
                const columns = row.split(',');
                return {
                    nombre: columns[0],
                    tipo: columns[1],
                    provincia: columns[2],
                    localidad: columns[3],
                    barrio: columns[4],
                    domicilio: columns[5],
                    codigoPostal: columns[6],
                    cuit: columns[7],
                    telefono: columns[8],
                    apVacuna: columns[9] === 'Si',
                    apVacunaMenor: columns[10] === 'Si'
                };
            });

            // Inicializar los filtros con los datos disponibles
            this.initFilterOptions();
            
            // Mostrar todos los vacunatorios inicialmente
            this.filterVacunatorios();
        } catch (error) {
            console.error('Error cargando los vacunatorios:', error);
        }
    }

    // Inicializar las opciones de los filtros
    initFilterOptions() {
        // Obtener provincias únicas
        const provincias = [...new Set(this.vacunatorios.map(v => v.provincia))].sort();
        const provinciaSelect = document.getElementById('provinciaFilter');
        provincias.forEach(provincia => {
            const option = document.createElement('option');
            option.value = provincia;
            option.textContent = provincia;
            provinciaSelect.appendChild(option);
        });
    }

    // Inicializar los eventos de los filtros
    initFilters() {
        // Eventos para los filtros
        document.getElementById('provinciaFilter').addEventListener('change', (e) => {
            this.filters.provincia = e.target.value;
            this.updateLocalidadesFilter();
            this.filterVacunatorios();
        });

        document.getElementById('localidadFilter').addEventListener('change', (e) => {
            this.filters.localidad = e.target.value;
            this.filterVacunatorios();
        });

        document.getElementById('apVacunaFilter').addEventListener('change', (e) => {
            this.filters.apVacuna = e.target.checked;
            this.filterVacunatorios();
        });

        document.getElementById('apVacunaMenorFilter').addEventListener('change', (e) => {
            this.filters.apVacunaMenor = e.target.checked;
            this.filterVacunatorios();
        });
    }

    // Actualizar las opciones de localidades basado en la provincia seleccionada
    updateLocalidadesFilter() {
        const localidadSelect = document.getElementById('localidadFilter');
        localidadSelect.innerHTML = '<option value="">Todas las localidades</option>';
        
        if (this.filters.provincia) {
            const localidades = [...new Set(
                this.vacunatorios
                    .filter(v => v.provincia === this.filters.provincia)
                    .map(v => v.localidad)
            )].sort();

            localidades.forEach(localidad => {
                const option = document.createElement('option');
                option.value = localidad;
                option.textContent = localidad;
                localidadSelect.appendChild(option);
            });
        }
    }

    // Filtrar y mostrar vacunatorios
    async filterVacunatorios() {
        // Limpiar marcadores existentes
        this.clearMarkers();
        this.bounds = new google.maps.LatLngBounds();

        // Obtener el texto de búsqueda
        const searchText = document.getElementById('searchInput').value.toLowerCase();

        // Filtrar vacunatorios
        const filteredVacunatorios = this.vacunatorios.filter(v => {
            const matchesSearch = !searchText || 
                v.nombre.toLowerCase().includes(searchText) ||
                v.domicilio.toLowerCase().includes(searchText);
            
            const matchesProvince = !this.filters.provincia || 
                v.provincia === this.filters.provincia;
            
            const matchesLocalidad = !this.filters.localidad || 
                v.localidad === this.filters.localidad;
            
            const matchesApVacuna = !this.filters.apVacuna || 
                v.apVacuna;
            
            const matchesApVacunaMenor = !this.filters.apVacunaMenor || 
                v.apVacunaMenor;

            return matchesSearch && matchesProvince && matchesLocalidad && 
                   matchesApVacuna && matchesApVacunaMenor;
        });

        // Actualizar la lista de resultados
        this.updateResultsList(filteredVacunatorios);

        // Geocodificar y mostrar en el mapa
        for (const vacunatorio of filteredVacunatorios) {
            await this.geocodeAndAddMarker(vacunatorio);
        }

        // Ajustar el mapa a los marcadores
        if (this.markers.length > 0) {
            this.map.fitBounds(this.bounds);
            if (this.markers.length === 1) {
                this.map.setZoom(15);
            }
        }
    }

    // Limpiar todos los marcadores del mapa
    clearMarkers() {
        this.markers.forEach(marker => marker.setMap(null));
        this.markers = [];
    }

    // Geocodificar dirección y agregar marcador
    async geocodeAndAddMarker(vacunatorio) {
        const address = `${vacunatorio.domicilio}, ${vacunatorio.localidad}, ${vacunatorio.provincia}, Argentina`;
        
        try {
            const result = await new Promise((resolve, reject) => {
                this.geocoder.geocode({ address }, (results, status) => {
                    if (status === 'OK') {
                        resolve(results[0]);
                    } else {
                        reject(status);
                    }
                });
            });

            const marker = new google.maps.Marker({
                map: this.map,
                position: result.geometry.location,
                title: vacunatorio.nombre
            });

            this.bounds.extend(result.geometry.location);
            this.markers.push(marker);

            // Agregar evento click al marcador
            marker.addListener('click', () => {
                const content = `
                    <div class="info-window">
                        <h3>${vacunatorio.nombre}</h3>
                        <p><strong>Dirección:</strong> ${vacunatorio.domicilio}</p>
                        <p><strong>Localidad:</strong> ${vacunatorio.localidad}</p>
                        <p><strong>Provincia:</strong> ${vacunatorio.provincia}</p>
                        ${vacunatorio.telefono ? `<p><strong>Teléfono:</strong> ${vacunatorio.telefono}</p>` : ''}
                        <p><strong>Aplica vacunas:</strong> ${vacunatorio.apVacuna ? 'Sí' : 'No'}</p>
                        <p><strong>Aplica vacunas a menores:</strong> ${vacunatorio.apVacunaMenor ? 'Sí' : 'No'}</p>
                    </div>
                `;
                this.infoWindow.setContent(content);
                this.infoWindow.open(this.map, marker);
            });

        } catch (error) {
            console.error(`Error geocoding ${address}:`, error);
        }
    }

    // Actualizar la lista de resultados
    updateResultsList(vacunatorios) {
        const container = document.getElementById('resultsList');
        container.innerHTML = '';

        vacunatorios.forEach(vacunatorio => {
            const card = document.createElement('div');
            card.className = 'card--result';
            card.innerHTML = `
                <h4>${vacunatorio.nombre}</h4>
                <p>${vacunatorio.domicilio}</p>
                <div class="card__num__ubicacion">
                    <div class="ubi__target">
                        <img src="../svg/mdi_location.svg" alt="ubicación">
                        <p>${vacunatorio.localidad}, ${vacunatorio.provincia}</p>
                    </div>
                    ${vacunatorio.telefono ? `
                        <div class="phone__target">
                            <img src="../svg/ph_phone-fill.svg" alt="Phone">
                            <p>${vacunatorio.telefono}</p>
                        </div>
                    ` : ''}
                </div>
            `;

            // Agregar evento click a la tarjeta
            card.addEventListener('click', () => {
                const marker = this.markers.find(m => m.getTitle() === vacunatorio.nombre);
                if (marker) {
                    this.map.panTo(marker.getPosition());
                    this.map.setZoom(15);
                    google.maps.event.trigger(marker, 'click');
                }
            });

            container.appendChild(card);
        });
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const vacunatoriosMap = new VacunatoriosMap();
    window.initMap = () => vacunatoriosMap.init();
}); 