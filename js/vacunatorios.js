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
        this.CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 horas en milisegundos
        
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
            // Actualizar el ID del mapa según el nuevo HTML
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
            
            // Actualizar el ID del input de búsqueda
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
        
        // Intentar cargar desde caché primero
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
            // Guardar en caché después de cargar exitosamente
            this.saveToCache(this.vacunatorios);
        } catch (error) {
            console.log('Error cargando desde Google Sheets:', error);
            try {
                console.log('Intentando cargar desde CSV local...');
                await this.loadFromLocalCSV();
                console.log('Datos cargados exitosamente desde CSV local');
                // Guardar en caché después de cargar exitosamente
                this.saveToCache(this.vacunatorios);
            } catch (localError) {
                console.log('Error cargando CSV local:', localError);
                console.log('Usando datos de ejemplo...');
                this.loadHardcodedData();
                console.log('Datos de ejemplo cargados');
                // No guardamos en caché los datos de ejemplo
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
        // Datos de ejemplo extendidos para mejor demostración
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
            
            if (char === '"' && (i === 0 || line[i-1] === ',')) {
                inQuotes = true;
            } else if (char === '"' && inQuotes && (i === line.length - 1 || line[i+1] === ',')) {
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
        
        // Actualizar el ID del select de provincia
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
        // Actualizar todos los IDs según el nuevo HTML
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
        // Actualizar el ID del select de localidad
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

        // Actualizar el ID del input de búsqueda
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
                        <div style="
                            width: 35px; 
                            height: 35px; 
                            background: linear-gradient(135deg, #7666EA, #9794EB);
                            border: 3px solid white;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: white;
                            font-weight: bold;
                            font-size: 16px;
                            box-shadow: 0 3px 10px rgba(118, 102, 234, 0.4);
                            cursor: pointer;
                            transition: transform 0.2s ease;
                        " onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                            ${vacunatorio.Tipo === 'Farmacia' ? '💊' : '🏥'}
                        </div>
                    `,
                    iconSize: [35, 35],
                    iconAnchor: [17, 17],
                    className: 'custom-marker-icon'
                });

                const marker = L.marker([lat, lon], { icon: customIcon }).addTo(this.map);
                
                const popupContent = `
                    <div style="min-width: 250px; font-family: Inter, Arial, sans-serif; line-height: 1.4;">
                        <h3 style="margin: 0 0 12px 0; color: #7666EA; font-size: 1.1rem;">${nombre}</h3>
                        <div style="margin-bottom: 8px;"><strong>Tipo:</strong> ${vacunatorio.Tipo}</div>
                        <div style="margin-bottom: 8px;"><strong>Dirección:</strong> ${vacunatorio.Domicilio}</div>
                        <div style="margin-bottom: 8px;"><strong>Localidad:</strong> ${vacunatorio.Localidad}</div>
                        <div style="margin-bottom: 8px;"><strong>Provincia:</strong> ${vacunatorio.Provincia}</div>
                        ${vacunatorio.Telefono ? `<div style="margin-bottom: 8px;"><strong>Teléfono:</strong> ${vacunatorio.Telefono}</div>` : ''}
                        <div style="margin-top: 12px; padding: 8px; background: #f8f9fa; border-radius: 6px;">
                            <div style="margin-bottom: 4px;"><strong>Servicios:</strong></div>
                            <div style="font-size: 0.9rem;">
                                ${vacunatorio['Ap.Vacuna'] === 'Si' ? '✅' : '❌'} Vacunas generales<br>
                                ${vacunatorio['Ap.Vacuna Menor'] === 'Si' ? '✅' : '❌'} Vacunas para menores
                            </div>
                        </div>
                    </div>
                `;
                
                marker.bindPopup(popupContent);
                
                this.bounds.extend([lat, lon]);
                this.markers.push(marker);
            }

        } catch (error) {
            console.error(`Error geocoding ${address}:`, error);
        }
    }

    updateResultsList(vacunatorios) {
        const container = document.getElementById('listaResultados');
        if (!container) return;
        
        if (vacunatorios.length === 0) {
            container.innerHTML = `
                <div class="sin-resultados">
                    <h4>No se encontraron resultados</h4>
                    <p>Intenta modificar los filtros de búsqueda</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';

        const counterDiv = document.createElement('div');
        counterDiv.style.cssText = `
            padding: 1rem 0;
            text-align: center;
            font-weight: 600;
            color: var(--text-gray);
            border-bottom: 1px solid var(--border-color);
            margin-bottom: 1rem;
        `;
        counterDiv.textContent = `${vacunatorios.length} resultado${vacunatorios.length !== 1 ? 's' : ''} encontrado${vacunatorios.length !== 1 ? 's' : ''}`;
        container.appendChild(counterDiv);

        vacunatorios.slice(0, 50).forEach(vacunatorio => {
            const nombre = vacunatorio.nombre || 'Sin nombre';
            
            const card = document.createElement('div');
            card.className = 'card-vacunatorio';
            card.innerHTML = `
                <h4 class="card-titulo">${nombre}</h4>
                <p class="card-direccion">${vacunatorio.Domicilio}</p>
                <div class="card-info">
                    <div class="info-item">
                        <span class="info-icon">🏢</span>
                        <span>${vacunatorio.Tipo}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-icon">📍</span>
                        <span>${vacunatorio.Localidad}, ${vacunatorio.Provincia}</span>
                    </div>
                    ${vacunatorio.Telefono ? `
                        <div class="info-item">
                            <span class="info-icon">📞</span>
                            <span>${vacunatorio.Telefono}</span>
                        </div>
                    ` : ''}
                    <div class="info-item">
                        <span class="info-icon">💉</span>
                        <span>
                            ${vacunatorio['Ap.Vacuna'] === 'Si' ? '✅ Vacunas generales' : '❌ Sin vacunas generales'}
                        </span>
                    </div>
                    <div class="info-item">
                        <span class="info-icon">👶</span>
                        <span>
                            ${vacunatorio['Ap.Vacuna Menor'] === 'Si' ? '✅ Vacunas menores' : '❌ Sin vacunas menores'}
                        </span>
                    </div>
                </div>
            `;

            card.addEventListener('click', () => {
                const targetMarker = this.markers.find(marker => {
                    const popup = marker.getPopup();
                    return popup && popup.getContent().includes(nombre);
                });
                
                if (targetMarker) {
                    const latlng = targetMarker.getLatLng();
                    this.map.setView(latlng, 16);
                    targetMarker.openPopup();
                    
                    document.querySelectorAll('.card-vacunatorio').forEach(c => {
                        c.style.borderColor = 'var(--border-color)';
                    });
                    card.style.borderColor = 'var(--primary-color)';
                    card.style.boxShadow = '0 4px 12px rgba(118, 102, 234, 0.2)';
                    
                    setTimeout(() => {
                        card.style.borderColor = 'var(--border-color)';
                        card.style.boxShadow = '';
                    }, 3000);
                }
            });

            container.appendChild(card);
        });
    }

    // Método para guardar en caché
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

    // Método para obtener de caché
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

    // Método para forzar una actualización de los datos
    async forceRefresh() {
        console.log('Forzando actualización de datos...');
        localStorage.removeItem(this.CACHE_KEY);
        await this.loadVacunatorios();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const vacunatoriosMap = new VacunatoriosMap();
    
    // Agregar botón de actualización al header del mapa
    const mapaHeader = document.querySelector('.mapa-header');
    if (mapaHeader) {
        const refreshButton = document.createElement('button');
        refreshButton.innerHTML = '🔄 Actualizar datos';
        refreshButton.style.cssText = `
            background: var(--primary-color);
            color: white;
            border: none;
            padding: 4px 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.85rem;
            display: flex;
            align-items: center;
            gap: 4px;
            transition: background-color 0.2s;
        `;
        refreshButton.onmouseover = () => refreshButton.style.backgroundColor = 'var(--primary-hover)';
        refreshButton.onmouseout = () => refreshButton.style.backgroundColor = 'var(--primary-color)';
        refreshButton.onclick = () => vacunatoriosMap.forceRefresh();
        
        const buttonContainer = document.createElement('div');
        buttonContainer.appendChild(refreshButton);
        mapaHeader.appendChild(buttonContainer);
    }

    vacunatoriosMap.init().catch(error => {
        console.error('Error inicializando el mapa:', error);
    });
});

function seleccionarVacunatorio(id) {
    console.log('Seleccionando vacunatorio:', id);
}