class VacunatoriosMap {
    constructor() {
        this.map = null;
        this.markers = [];
        this.vacunatorios = [];
        this.bounds = null;
        this.currentTileLayer = null;

        this.SHEETS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRMcbWuANTMtRJIPZ4_srNBSBrvXNxiBHyp2L37Gy1wZCFuXkmJmkeyPFzuEhnWj1OSiEODBqwQne2A/pub?output=csv';
        this.LOCAL_CSV_URL = '/vacunas.csv';
        this.CACHE_KEY = 'vacunatorios_cache';
        this.CACHE_EXPIRY = 24 * 60 * 60 * 1000;

        this.tileProviders = [
            {
                name: 'CartoDB Positron',
                url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
                options: {
                    attribution: '© OpenStreetMap contributors, © CARTO',
                    subdomains: 'abcd',
                    maxZoom: 19
                }
            },
            {
                name: 'OpenStreetMap',
                url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                options: {
                    attribution: '© OpenStreetMap contributors',
                    maxZoom: 19
                }
            }
        ];

        this.filters = {
            provincia: '',
            localidad: '',
            apVacuna: false,
            apVacunaMenor: false
        };

        this.currentTileProviderIndex = 0;
    }

    async init() {
        console.log('Iniciando mapa...');
        try {
            const mapContainer = document.getElementById('mapa');
            if (!mapContainer) {
                console.error('No se encontró el contenedor del mapa con ID "mapa"');
                return;
            }
            console.log('Contenedor del mapa encontrado:', mapContainer);

            this.map = L.map('mapa', {
                center: [-38.416097, -63.616672],
                zoom: 5,
                zoomControl: false
            });
            console.log('Mapa Leaflet inicializado');

            this.loadTileLayer();
            L.control.zoom({ position: 'topright' }).addTo(this.map);

            this.bounds = L.latLngBounds();

            await this.loadVacunatorios();
            this.initFilters();

            const searchInput = document.getElementById('inputBusqueda');
            if (searchInput) {
                searchInput.addEventListener('input',
                    this.debounce(() => this.filterVacunatorios(), 300)
                );
            }
            console.log('Inicialización del mapa completada');
        } catch (error) {
            console.error('Error durante la inicialización del mapa:', error);
        }
    }

    loadTileLayer() {
        console.log('Cargando capa de mapa...');
        const provider = this.tileProviders[this.currentTileProviderIndex];

        if (this.currentTileLayer) {
            this.map.removeLayer(this.currentTileLayer);
        }

        this.currentTileLayer = L.tileLayer(provider.url, provider.options);
        this.currentTileLayer.addTo(this.map);
        console.log('Capa de mapa cargada:', provider.name);

        this.currentTileLayer.on('tileerror', (error) => {
            console.error('Error cargando tiles:', error);
            this.switchTileProvider();
        });
    }

    switchTileProvider() {
        this.currentTileProviderIndex = (this.currentTileProviderIndex + 1) % this.tileProviders.length;
        setTimeout(() => this.loadTileLayer(), 1000);
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    async loadVacunatorios() {
        console.log('Iniciando carga de vacunatorios...');

        const cachedData = this.getFromCache();
        if (cachedData) {
            console.log('Usando datos en caché');
            this.vacunatorios = cachedData;
            this.initFilterOptions();
            this.filterVacunatorios();
            return;
        }

        try {
            console.log('Intentando cargar desde Google Sheets...');
            await this.loadFromGoogleSheets();
            console.log('Datos cargados exitosamente desde Google Sheets');
            this.saveToCache(this.vacunatorios);
        } catch (error) {
            console.log('Error cargando desde Google Sheets:', error);
            try {
                console.log('Intentando cargar desde CSV local...');
                await this.loadFromLocalCSV();
                console.log('Datos cargados exitosamente desde CSV local');
                this.saveToCache(this.vacunatorios);
            } catch (localError) {
                console.log('Error cargando CSV local:', localError);
                console.log('Usando datos de ejemplo...');
                this.loadHardcodedData();
                console.log('Datos de ejemplo cargados');
            }
        }

        this.initFilterOptions();
        this.filterVacunatorios();
    }

    async loadFromGoogleSheets() {
        const response = await fetch(this.SHEETS_CSV_URL);
        if (!response.ok) throw new Error('Error cargando Google Sheets');
        const csvText = await response.text();
        this.vacunatorios = this.parseCSV(csvText);
    }

    async loadFromLocalCSV() {
        const response = await fetch(this.LOCAL_CSV_URL);
        if (!response.ok) throw new Error('Error cargando CSV local');
        const csvText = await response.text();
        this.vacunatorios = this.parseCSV(csvText);
    }

    loadHardcodedData() {
        this.vacunatorios = [
            {
                nombre: "Hospital Nacional Posadas",
                Tipo: "Hospital",
                Provincia: "Buenos Aires",
                Localidad: "El Palomar",
                Domicilio: "Av. Presidente Illia s/n",
                "Ap.Vacuna": "Si",
                "Ap.Vacuna Menor": "Si",
                Telefono: "(011) 4469-9300"
            },
            {
                nombre: "Centro de Salud Norte",
                Tipo: "Centro de Salud",
                Provincia: "Capital Federal",
                Localidad: "Buenos Aires",
                Domicilio: "Av. Corrientes 1234",
                "Ap.Vacuna": "Si",
                "Ap.Vacuna Menor": "Si",
                Telefono: "(011) 4123-4567"
            },
            {
                nombre: "Farmacia San Martín",
                Tipo: "Farmacia",
                Provincia: "Santa Fe",
                Localidad: "Rosario",
                Domicilio: "San Martín 567",
                "Ap.Vacuna": "Si",
                "Ap.Vacuna Menor": "No",
                Telefono: "(0341) 456-7890"
            },
            {
                nombre: "Hospital Municipal",
                Tipo: "Hospital",
                Provincia: "Buenos Aires",
                Localidad: "La Plata",
                Domicilio: "Belgrano 890",
                "Ap.Vacuna": "Si",
                "Ap.Vacuna Menor": "Si",
                Telefono: "(0221) 234-5678"
            },
            {
                nombre: "Farmacia Del Centro",
                Tipo: "Farmacia",
                Provincia: "Córdoba",
                Localidad: "Córdoba",
                Domicilio: "Av. Vélez Sársfield 456",
                "Ap.Vacuna": "Si",
                "Ap.Vacuna Menor": "No",
                Telefono: "(0351) 123-4567"
            }
        ];
    }

    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) return [];

        const headers = this.parseCSVLine(lines[0]);
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
                const values = this.parseCSVLine(lines[i]);
                const obj = {};
                headers.forEach((header, index) => {
                    obj[header] = values[index] || '';
                });

                if (!obj.nombre && headers[0]) {
                    obj.nombre = obj[headers[0]];
                }

                data.push(obj);
            }
        }
        return data;
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"' && (i === 0 || line[i - 1] === ',')) {
                inQuotes = true;
            } else if (char === '"' && inQuotes && (i === line.length - 1 || line[i + 1] === ',')) {
                inQuotes = false;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else if (char !== '"' || inQuotes) {
                current += char;
            }
        }

        result.push(current.trim());
        return result;
    }

    initFilterOptions() {
        const provincias = [...new Set(this.vacunatorios.map(v => v.Provincia).filter(p => p))].sort();

        const provinciaSelect = document.getElementById('filtroProvincia');
        if (provinciaSelect) {
            provinciaSelect.innerHTML = '<option value="">Todas las provincias</option>';

            provincias.forEach(provincia => {
                const option = document.createElement('option');
                option.value = provincia;
                option.textContent = provincia;
                provinciaSelect.appendChild(option);
            });
        }
    }

    initFilters() {
        const provinciaFilter = document.getElementById('filtroProvincia');
        const localidadFilter = document.getElementById('filtroLocalidad');
        const vacunaFilter = document.getElementById('filtroVacunas');
        const menorFilter = document.getElementById('filtroMenores');

        if (provinciaFilter) {
            provinciaFilter.addEventListener('change', (e) => {
                this.filters.provincia = e.target.value;
                this.updateLocalidadesFilter();
                this.filterVacunatorios();
            });
        }

        if (localidadFilter) {
            localidadFilter.addEventListener('change', (e) => {
                this.filters.localidad = e.target.value;
                this.filterVacunatorios();
            });
        }

        if (vacunaFilter) {
            vacunaFilter.addEventListener('change', (e) => {
                this.filters.apVacuna = e.target.checked;
                this.filterVacunatorios();
            });
        }

        if (menorFilter) {
            menorFilter.addEventListener('change', (e) => {
                this.filters.apVacunaMenor = e.target.checked;
                this.filterVacunatorios();
            });
        }
    }

    updateLocalidadesFilter() {
        const localidadSelect = document.getElementById('filtroLocalidad');
        if (!localidadSelect) return;

        localidadSelect.innerHTML = '<option value="">Todas las localidades</option>';

        if (this.filters.provincia) {
            const localidades = [...new Set(
                this.vacunatorios
                    .filter(v => v.Provincia === this.filters.provincia)
                    .map(v => v.Localidad)
                    .filter(l => l)
            )].sort();

            localidades.forEach(localidad => {
                const option = document.createElement('option');
                option.value = localidad;
                option.textContent = localidad;
                localidadSelect.appendChild(option);
            });
        }
    }

    async filterVacunatorios() {
        this.clearMarkers();
        this.bounds = L.latLngBounds();

        const searchInput = document.getElementById('inputBusqueda');
        const searchText = searchInput ? searchInput.value.toLowerCase() : '';

        const filteredVacunatorios = this.vacunatorios.filter(v => {
            const nombre = v.nombre || '';
            const matchesSearch = !searchText ||
                nombre.toLowerCase().includes(searchText) ||
                (v.Domicilio && v.Domicilio.toLowerCase().includes(searchText)) ||
                (v.Localidad && v.Localidad.toLowerCase().includes(searchText));

            const matchesProvince = !this.filters.provincia || v.Provincia === this.filters.provincia;
            const matchesLocalidad = !this.filters.localidad || v.Localidad === this.filters.localidad;
            const matchesApVacuna = !this.filters.apVacuna || v['Ap.Vacuna'] === 'Si';
            const matchesApVacunaMenor = !this.filters.apVacunaMenor || v['Ap.Vacuna Menor'] === 'Si';

            return matchesSearch && matchesProvince && matchesLocalidad &&
                matchesApVacuna && matchesApVacunaMenor;
        });

        this.updateResultsList(filteredVacunatorios);

        const toGeocode = filteredVacunatorios.slice(0, 30);

        for (const vacunatorio of toGeocode) {
            await this.geocodeAndAddMarker(vacunatorio);
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        if (this.markers.length > 0) {
            this.map.fitBounds(this.bounds, { padding: [20, 20] });
            if (this.markers.length === 1) {
                this.map.setZoom(15);
            }
        }
    }

    clearMarkers() {
        this.markers.forEach(marker => this.map.removeLayer(marker));
        this.markers = [];
    }

    async geocodeAndAddMarker(vacunatorio) {
        const nombre = vacunatorio.nombre || 'Sin nombre';
        if (!vacunatorio.Domicilio || !vacunatorio.Localidad) return;

        const address = `${vacunatorio.Domicilio}, ${vacunatorio.Localidad}, ${vacunatorio.Provincia}, Argentina`;

        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=ar`,
                {
                    headers: {
                        'User-Agent': 'VacunatoriosApp/1.0'
                    }
                }
            );

            const results = await response.json();

            if (results.length > 0) {
                const lat = parseFloat(results[0].lat);
                const lon = parseFloat(results[0].lon);

                const customIcon = L.divIcon({
                    html: `
                        <div class="custom-marker-container">
                            <div class="marker-pulse"></div>
                            <div class="marker-icon" data-tipo="${vacunatorio.Tipo}">
                                ${this.getMarkerIcon(vacunatorio.Tipo)}
                            </div>
                        </div>
                    `,
                    iconSize: [40, 40],
                    iconAnchor: [20, 40],
                    className: 'custom-marker-wrapper'
                });

                const marker = L.marker([lat, lon], { icon: customIcon }).addTo(this.map);

                const popupContent = this.createPopupContent(vacunatorio);

                marker.bindPopup(popupContent, {
                    maxWidth: 350,
                    className: 'custom-popup'
                });

                this.bounds.extend([lat, lon]);
                this.markers.push(marker);
            }

        } catch (error) {
            console.error(`Error geocoding ${address}:`, error);
        }
    }

    getMarkerIcon(tipo) {
        const icons = {
            'Hospital': `<svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M19 8h-2v3h-3v2h3v3h2v-3h3v-2h-3V8zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z"/>
            </svg>`,
            'Farmacia': `<svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M3,3H21V5H19V19A2,2 0 0,1 17,21H7A2,2 0 0,1 5,19V5H3V3M9,8V10H7V12H9V14H11V12H13V10H11V8H9Z"/>
            </svg>`,
            'Centro de Salud': `<svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19.78,11 20.5,11.35 21,12C21.5,12.65 21.5,13.35 21,14C20.5,14.65 19.78,15 19,15H17V19H15V15H13V17H11V15H9V19H7V15H5C4.22,15 3.5,14.65 3,14C2.5,13.35 2.5,12.65 3,12C3.5,11.35 4.22,11 5,11H19Z"/>
            </svg>`
        };
        return icons[tipo] || icons['Centro de Salud'];
    }

    createPopupContent(vacunatorio) {
        const nombre = vacunatorio.nombre || 'Sin nombre';
        return `
            <div class="popup-content">
                <div class="popup-header">
                    <div class="popup-icon">${this.getMarkerIcon(vacunatorio.Tipo)}</div>
                    <div class="popup-title">
                        <h3>${nombre}</h3>
                        <span class="popup-tipo">${vacunatorio.Tipo}</span>
                    </div>
                </div>

                <div class="popup-body">
                    <div class="popup-info-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="#7666EA">
                            <path d="M12,2C15.31,2 18,4.66 18,7.95C18,12.41 12,22 12,22S6,12.41 6,7.95C6,4.66 8.69,2 12,2M12,6A2,2 0 0,0 10,8A2,2 0 0,0 12,10A2,2 0 0,0 14,8A2,2 0 0,0 12,6Z"/>
                        </svg>
                        <div>
                            <div class="info-label">Dirección</div>
                            <div class="info-value">${vacunatorio.Domicilio}</div>
                            <div class="info-value">${vacunatorio.Localidad}, ${vacunatorio.Provincia}</div>
                        </div>
                    </div>

                    ${vacunatorio.Telefono ? `
                        <div class="popup-info-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="#7666EA">
                                <path d="M6.62,10.79C8.06,13.62 10.38,15.94 13.21,17.38L15.41,15.18C15.69,14.9 16.08,14.82 16.43,14.93C17.55,15.3 18.75,15.5 20,15.5A1,1 0 0,1 21,16.5V20A1,1 0 0,1 20,21A17,17 0 0,1 3,4A1,1 0 0,1 4,3H7.5A1,1 0 0,1 8.5,4C8.5,5.25 8.7,6.45 9.07,7.57C9.18,7.92 9.1,8.31 8.82,8.59L6.62,10.79Z"/>
                            </svg>
                            <div>
                                <div class="info-label">Teléfono</div>
                                <div class="info-value">${vacunatorio.Telefono}</div>
                            </div>
                        </div>
                    ` : ''}

                    <div class="popup-services">
                        <div class="services-title">Servicios disponibles</div>
                        <div class="services-grid">
                            <div class="service-item ${vacunatorio['Ap.Vacuna'] === 'Si' ? 'available' : 'unavailable'}">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="${vacunatorio['Ap.Vacuna'] === 'Si' ? '#27ae60' : '#e74c3c'}">
                                    <path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"/>
                                </svg>
                                <span>Vacunas generales</span>
                            </div>
                            <div class="service-item ${vacunatorio['Ap.Vacuna Menor'] === 'Si' ? 'available' : 'unavailable'}">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="${vacunatorio['Ap.Vacuna Menor'] === 'Si' ? '#27ae60' : '#e74c3c'}">
                                    <path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"/>
                                </svg>
                                <span>Vacunas para menores</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    updateResultsList(vacunatorios) {
        const container = document.getElementById('listaResultados');
        if (!container) return;

        if (vacunatorios.length === 0) {
            container.innerHTML = `
                <div class="sin-resultados">
                    <div class="sin-resultados-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="#9794EB">
                            <path d="M15.5,14H20.5L22,15.5V20.5L20.5,22H15.5L14,20.5V15.5L15.5,14M16,16V20H20V16H16M10.91,19.91L9.5,18.5L8.09,19.91L7,18.83L8.41,17.41L7,16L8.09,14.91L9.5,16.31L10.91,14.91L12,16L10.59,17.41L12,18.83L10.91,19.91M22,9V7H20V9H22M20,5V3H22V5H20M18,5H16V3H18V5Z"/>
                        </svg>
                    </div>
                    <h4>No se encontraron resultados</h4>
                    <p>Prueba modificando los filtros de búsqueda o el término buscado</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';

        const counterDiv = document.createElement('div');
        counterDiv.className = 'resultados-counter';
        counterDiv.innerHTML = `
            <div class="counter-content">
                <span class="counter-number">${vacunatorios.length}</span>
                <span class="counter-text">resultado${vacunatorios.length !== 1 ? 's' : ''} encontrado${vacunatorios.length !== 1 ? 's' : ''}</span>
            </div>
        `;
        container.appendChild(counterDiv);

        vacunatorios.slice(0, 50).forEach((vacunatorio, index) => {
            const nombre = vacunatorio.nombre || vacunatorio.Nombre || 'Sin nombre';
            const tipo = vacunatorio.Tipo || 'Centro de Salud';
            const domicilio = vacunatorio.Domicilio || 'Sin dirección';
            const localidad = vacunatorio.Localidad || 'Sin localidad';
            const provincia = vacunatorio.Provincia || 'Sin provincia';
            const telefono = vacunatorio.Telefono || '';
            const apVacuna = vacunatorio['Ap.Vacuna'] || 'No';
            const apVacunaMenor = vacunatorio['Ap.Vacuna Menor'] || 'No';

            const card = document.createElement('div');
            card.className = 'card-vacunatorio';
            card.innerHTML = `
                <div class="card-header">
                    <div class="card-icon">
                        ${this.getMarkerIcon(tipo)}
                    </div>
                    <div class="card-title-section">
                        <h4 class="card-titulo">${nombre}</h4>
                        <span class="card-tipo">${tipo}</span>
                    </div>
                </div>

                <div class="card-content">
                    <div class="card-info">
                        <div class="info-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="#7666EA">
                                <path d="M12,2C15.31,2 18,4.66 18,7.95C18,12.41 12,22 12,22S6,12.41 6,7.95C6,4.66 8.69,2 12,2M12,6A2,2 0 0,0 10,8A2,2 0 0,0 12,10A2,2 0 0,0 14,8A2,2 0 0,0 12,6Z"/>
                            </svg>
                            <div>
                                <div class="info-primary">${domicilio}</div>
                                <div class="info-secondary">${localidad}, ${provincia}</div>
                            </div>
                        </div>

                        ${telefono ? `
                            <div class="info-item">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="#7666EA">
                                    <path d="M6.62,10.79C8.06,13.62 10.38,15.94 13.21,17.38L15.41,15.18C15.69,14.9 16.08,14.82 16.43,14.93C17.55,15.3 18.75,15.5 20,15.5A1,1 0 0,1 21,16.5V20A1,1 0 0,1 20,21A17,17 0 0,1 3,4A1,1 0 0,1 4,3H7.5A1,1 0 0,1 8.5,4C8.5,5.25 8.7,6.45 9.07,7.57C9.18,7.92 9.1,8.31 8.82,8.59L6.62,10.79Z"/>
                                </svg>
                                <span>${telefono}</span>
                            </div>
                        ` : ''}
                    </div>

                    <div class="card-services">
                        <div class="service-badge ${apVacuna === 'Si' ? 'available' : 'unavailable'}">
                            ${apVacuna === 'Si' ? '✓' : '✗'} Vacunas generales
                        </div>
                        <div class="service-badge ${apVacunaMenor === 'Si' ? 'available' : 'unavailable'}">
                            ${apVacunaMenor === 'Si' ? '✓' : '✗'} Vacunas menores
                        </div>
                    </div>
                </div>

                <div class="card-action">
                    <button class="btn-ver-mapa">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12,2C15.31,2 18,4.66 18,7.95C18,12.41 12,22 12,22S6,12.41 6,7.95C6,4.66 8.69,2 12,2M12,6A2,2 0 0,0 10,8A2,2 0 0,0 12,10A2,2 0 0,0 14,8A2,2 0 0,0 12,6Z"/>
                        </svg>
                        Ver en mapa
                    </button>
                </div>
            `;

            card.addEventListener('click', () => {
                const targetMarker = this.markers.find(marker => {
                    const popup = marker.getPopup();
                    return popup && popup.getContent().includes(nombre);
                });

                if (targetMarker) {
                    document.querySelectorAll('.card-vacunatorio').forEach(c => {
                        c.classList.remove('selected');
                    });
                    card.classList.add('selected');

                    targetMarker.openPopup();

                    setTimeout(() => {
                        card.classList.remove('selected');
                    }, 3000);
                }
            });

            container.appendChild(card);
        });
    }

    saveToCache(data) {
        const cacheData = {
            timestamp: Date.now(),
            data: data
        };
        try {
            localStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData));
            console.log('Datos guardados en caché');
        } catch (error) {
            console.error('Error guardando en caché:', error);
        }
    }

    getFromCache() {
        try {
            const cached = localStorage.getItem(this.CACHE_KEY);
            if (!cached) return null;

            const { timestamp, data } = JSON.parse(cached);
            const isExpired = Date.now() - timestamp > this.CACHE_EXPIRY;

            if (isExpired) {
                console.log('Caché expirado');
                localStorage.removeItem(this.CACHE_KEY);
                return null;
            }

            console.log('Datos recuperados de caché');
            return data;
        } catch (error) {
            console.error('Error recuperando de caché:', error);
            return null;
        }
    }

    async forceRefresh() {
        console.log('Forzando actualización de datos...');
        localStorage.removeItem(this.CACHE_KEY);
        await this.loadVacunatorios();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const vacunatoriosMap = new VacunatoriosMap();

    const mapaHeader = document.querySelector('.mapa-header');
    if (mapaHeader) {
        const refreshButton = document.createElement('button');
        refreshButton.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z"/>
            </svg>
            Actualizar
        `;
        refreshButton.className = 'btn-refresh';
        refreshButton.onclick = () => vacunatoriosMap.forceRefresh();

        mapaHeader.appendChild(refreshButton);
    }

    vacunatoriosMap.init().catch(error => {
        console.error('Error inicializando el mapa:', error);
    });
});

function seleccionarVacunatorio(id) {
    console.log('Seleccionando vacunatorio:', id);
}
