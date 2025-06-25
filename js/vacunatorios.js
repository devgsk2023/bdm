class VacunatoriosMapOptimized {
    constructor() {
        this.map = null;
        this.markers = [];
        this.vacunatorios = [];
        this.coordinatesData = [];
        this.bounds = null;
        this.currentTileLayer = null;
        this.isLoading = false;
        this.renderQueue = [];

        this.COORDINATES_JSON_URL = '/data/vacunatorios_coordinates.json';
        this.SHEETS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRMcbWuANTMtRJIPZ4_srNBSBrvXNxiBHyp2L37Gy1wZCFuXkmJmkeyPFzuEhnWj1OSiEODBqwQne2A/pub?output=csv';
        this.LOCAL_CSV_URL = '/vacunas.csv';

        this.CACHE_KEY = 'vacunatorios_cache_v4';
        this.COORDINATES_CACHE_KEY = 'coordinates_cache_v4';
        this.CACHE_EXPIRY = 24 * 60 * 60 * 1000;
        this.PRELOAD_CACHE_KEY = 'vacunatorios_preload_v4';

        this.tileProviders = [
            {
                name: 'CartoDB Positron',
                url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
                options: {
                    attribution: '© OpenStreetMap contributors, © CARTO',
                    subdomains: 'abcd',
                    maxZoom: 18,
                    updateWhenIdle: true,
                    keepBuffer: 2
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

        this.searchThrottle = this.throttle(this.filterVacunatorios.bind(this), 300);
    }

    async preloadData() {
        try {
            const preloadData = this.getPreloadFromCache();
            if (preloadData) {
                console.log('Usando datos precargados');
                this.coordinatesData = preloadData;
                return true;
            }
            this.preloadInBackground();
            return false;
        } catch (error) {
            console.error('Error en precarga:', error);
            return false;
        }
    }

    async preloadInBackground() {
        try {
            const coordinatesResponse = await fetch(this.COORDINATES_JSON_URL);
            if (coordinatesResponse.ok) {
                const coordinatesJson = await coordinatesResponse.json();
                const data = coordinatesJson.data || coordinatesJson;
                this.savePreloadToCache(data);
                console.log('Datos precargados en background');
            }
        } catch (error) {
            console.log('Error en precarga background:', error);
        }
    }

    savePreloadToCache(data) {
        const cacheData = {
            timestamp: Date.now(),
            data: data
        };
        try {
            localStorage.setItem(this.PRELOAD_CACHE_KEY, JSON.stringify(cacheData));
        } catch (error) {
            console.error('Error guardando precarga:', error);
        }
    }

    getPreloadFromCache() {
        try {
            const cached = localStorage.getItem(this.PRELOAD_CACHE_KEY);
            if (!cached) return null;

            const { timestamp, data } = JSON.parse(cached);
            const isExpired = Date.now() - timestamp > this.CACHE_EXPIRY;

            if (isExpired) {
                localStorage.removeItem(this.PRELOAD_CACHE_KEY);
                return null;
            }

            return data;
        } catch (error) {
            console.error('Error recuperando precarga:', error);
            return null;
        }
    }

    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
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

    async init() {
        console.log('Iniciando mapa optimizado...');
        this.showLoading();

        try {
            const mapContainer = document.getElementById('mapa');
            if (!mapContainer) {
                console.error('No se encontró el contenedor del mapa');
                this.hideLoading();
                return;
            }

            this.map = L.map('mapa', {
                center: [-38.416097, -63.616672],
                zoom: 5,
                zoomControl: false,
                preferCanvas: true,
                updateWhenIdle: true,
                keepBuffer: 2
            });

            this.loadTileLayer();
            L.control.zoom({ position: 'topright' }).addTo(this.map);
            this.bounds = L.latLngBounds();

            const preloaded = await this.preloadData();
            if (preloaded) {
                this.initFilterOptions();
                this.displayAllMarkers();
            } else {
                await this.loadVacunatoriosWithCoordinates();
            }

            this.initFilters();
            this.hideLoading();

            console.log('Mapa inicializado correctamente');
        } catch (error) {
            console.error('Error durante la inicialización:', error);
            this.hideLoading();
            this.showError('Error inicializando el mapa. Por favor, recarga la página.');
        }
    }

    showLoading() {
        const container = document.getElementById('listaResultados');
        if (container) {
            container.innerHTML = '<div class="loading">Cargando vacunatorios...</div>';
        }
    }

    hideLoading() {
    }

    showError(message) {
        const container = document.getElementById('listaResultados');
        if (container) {
            container.innerHTML = `
                <div class="sin-resultados">
                    <h4>Error</h4>
                    <p>${message}</p>
                </div>
            `;
        }
    }

    async loadVacunatoriosWithCoordinates() {
        console.log('Cargando coordenadas...');

        const cachedCoordinates = this.getCoordinatesFromCache();
        if (cachedCoordinates) {
            console.log('Usando coordenadas en caché');
            this.coordinatesData = cachedCoordinates;
            this.initFilterOptions();
            this.displayAllMarkers();
            return;
        }

        try {
            const coordinatesResponse = await fetch(this.COORDINATES_JSON_URL);
            if (coordinatesResponse.ok) {
                const coordinatesJson = await coordinatesResponse.json();
                this.coordinatesData = coordinatesJson.data || coordinatesJson;
                console.log(`Coordenadas cargadas: ${this.coordinatesData.length}`);

                this.saveCoordinatesToCache(this.coordinatesData);
                this.initFilterOptions();
                this.displayAllMarkers();
                return;
            }
        } catch (error) {
            console.log('Error cargando coordenadas, usando fallback');
        }

        await this.loadVacunatoriosOriginal();
    }

    displayAllMarkers() {
        console.log('Mostrando marcadores...');
        this.clearMarkers();
        this.bounds = L.latLngBounds();

        const chunkSize = 50;
        let processed = 0;

        const processChunk = () => {
            const chunk = this.coordinatesData.slice(processed, processed + chunkSize);

            chunk.forEach(vacunatorio => {
                if (vacunatorio.lat && vacunatorio.lng) {
                    this.addMarkerFromCoordinates(vacunatorio);
                }
            });

            processed += chunkSize;

            if (processed < this.coordinatesData.length) {
                requestAnimationFrame(processChunk);
            } else {
                this.finalizarMarcadores();
            }
        };

        requestAnimationFrame(processChunk);
    }

    finalizarMarcadores() {
        if (this.markers.length > 0) {
            this.map.fitBounds(this.bounds, { padding: [20, 20] });
        }
        this.updateResultsList(this.coordinatesData);
    }

    addMarkerFromCoordinates(vacunatorio) {
        const lat = parseFloat(vacunatorio.lat);
        const lng = parseFloat(vacunatorio.lng);

        if (isNaN(lat) || isNaN(lng)) {
            return;
        }

        const customIcon = L.divIcon({
            html: `<div class="marker-icon" data-tipo="${vacunatorio.tipo}">${this.getMarkerIcon(vacunatorio.tipo)}</div>`,
            iconSize: [36, 36],
            iconAnchor: [18, 36],
            className: 'custom-marker-wrapper'
        });

        const marker = L.marker([lat, lng], { icon: customIcon }).addTo(this.map);
        const popupContent = this.createPopupContent(vacunatorio);

        marker.bindPopup(popupContent, {
            maxWidth: 320,
            className: 'custom-popup'
        });

        this.bounds.extend([lat, lng]);
        this.markers.push(marker);
    }

    async filterVacunatorios() {
        if (this.isLoading) return;
        this.isLoading = true;

        this.clearMarkers();
        this.bounds = L.latLngBounds();

        const searchInput = document.getElementById('inputBusqueda');
        const searchText = searchInput ? searchInput.value.toLowerCase().trim() : '';

        let dataToFilter = this.coordinatesData.length > 0 ? this.coordinatesData : this.vacunatorios;

        const filteredVacunatorios = dataToFilter.filter(v => {
            if (!v) return false;

            const nombre = (v.nombre || '').toLowerCase();
            const domicilio = (v.domicilio || v.Domicilio || '').toLowerCase();
            const localidad = (v.localidad || v.Localidad || '').toLowerCase();

            const matchesSearch = !searchText ||
                nombre.includes(searchText) ||
                domicilio.includes(searchText) ||
                localidad.includes(searchText);

            if (!matchesSearch) return false;

            const provincia = v.provincia || v.Provincia || '';
            const apVacuna = v.apVacuna || v['Ap.Vacuna'] || 'No';
            const apVacunaMenor = v.apVacunaMenor || v['Ap.Vacuna Menor'] || 'No';

            const matchesProvince = !this.filters.provincia || provincia === this.filters.provincia;
            const matchesLocalidad = !this.filters.localidad || localidad === this.filters.localidad.toLowerCase();
            const matchesApVacuna = !this.filters.apVacuna || apVacuna === 'Si';
            const matchesApVacunaMenor = !this.filters.apVacunaMenor || apVacunaMenor === 'Si';

            return matchesProvince && matchesLocalidad && matchesApVacuna && matchesApVacunaMenor;
        });

        await this.renderFilteredResults(filteredVacunatorios);
        this.isLoading = false;
    }

    async renderFilteredResults(filteredVacunatorios) {
        this.updateResultsList(filteredVacunatorios);

        if (this.coordinatesData.length > 0) {
            const chunkSize = 20;
            let processed = 0;

            const processChunk = () => {
                const chunk = filteredVacunatorios.slice(processed, processed + chunkSize);

                chunk.forEach(vacunatorio => {
                    if (vacunatorio.lat && vacunatorio.lng) {
                        this.addMarkerFromCoordinates(vacunatorio);
                    }
                });

                processed += chunkSize;

                if (processed < filteredVacunatorios.length) {
                    requestAnimationFrame(processChunk);
                } else {
                    this.finalizarFiltrado();
                }
            };

            requestAnimationFrame(processChunk);
        }
    }

    finalizarFiltrado() {
        if (this.markers.length > 0) {
            this.map.fitBounds(this.bounds, { padding: [20, 20] });
            if (this.markers.length === 1) {
                this.map.setZoom(15);
            }
        }
    }

    initFilterOptions() {
        let dataToUse = this.coordinatesData.length > 0 ? this.coordinatesData : this.vacunatorios;

        const provincias = [...new Set(dataToUse.map(v =>
            v.provincia || v.Provincia || ''
        ).filter(p => p))].sort();

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

    updateLocalidadesFilter() {
        const localidadSelect = document.getElementById('filtroLocalidad');
        if (!localidadSelect) return;

        localidadSelect.innerHTML = '<option value="">Todas las localidades</option>';

        if (this.filters.provincia) {
            let dataToUse = this.coordinatesData.length > 0 ? this.coordinatesData : this.vacunatorios;

            const localidades = [...new Set(
                dataToUse
                    .filter(v => (v.provincia || v.Provincia) === this.filters.provincia)
                    .map(v => v.localidad || v.Localidad || '')
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

    createPopupContent(vacunatorio) {
        const nombre = vacunatorio.nombre || 'Sin nombre';
        const tipo = vacunatorio.tipo || vacunatorio.Tipo || 'Centro de Salud';
        const domicilio = vacunatorio.domicilio || vacunatorio.Domicilio || '';
        const localidad = vacunatorio.localidad || vacunatorio.Localidad || '';
        const provincia = vacunatorio.provincia || vacunatorio.Provincia || '';
        const telefono = vacunatorio.telefono || vacunatorio.Telefono || '';
        const apVacuna = vacunatorio.apVacuna || vacunatorio['Ap.Vacuna'] || 'No';
        const apVacunaMenor = vacunatorio.apVacunaMenor || vacunatorio['Ap.Vacuna Menor'] || 'No';

        return `
            <div class="popup-content">
                <div class="popup-header">
                    <div class="popup-icon">${this.getMarkerIcon(tipo)}</div>
                    <div class="popup-title">
                        <h3>${nombre}</h3>
                        <span class="popup-tipo">${tipo}</span>
                    </div>
                </div>
                <div class="popup-body">
                    <div class="popup-info-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#7666EA">
                            <path d="M12,2C15.31,2 18,4.66 18,7.95C18,12.41 12,22 12,22S6,12.41 6,7.95C6,4.66 8.69,2 12,2M12,6A2,2 0 0,0 10,8A2,2 0 0,0 12,10A2,2 0 0,0 14,8A2,2 0 0,0 12,6Z"/>
                        </svg>
                        <div>
                            <div class="info-label">Dirección</div>
                            <div class="info-value">${domicilio}</div>
                            <div class="info-value">${localidad}, ${provincia}</div>
                        </div>
                    </div>
                    ${telefono ? `
                        <div class="popup-info-item">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="#7666EA">
                                <path d="M6.62,10.79C8.06,13.62 10.38,15.94 13.21,17.38L15.41,15.18C15.69,14.9 16.08,14.82 16.43,14.93C17.55,15.3 18.75,15.5 20,15.5A1,1 0 0,1 21,16.5V20A1,1 0 0,1 20,21A17,17 0 0,1 3,4A1,1 0 0,1 4,3H7.5A1,1 0 0,1 8.5,4C8.5,5.25 8.7,6.45 9.07,7.57C9.18,7.92 9.1,8.31 8.82,8.59L6.62,10.79Z"/>
                            </svg>
                            <div>
                                <div class="info-label">Teléfono</div>
                                <div class="info-value">${telefono}</div>
                            </div>
                        </div>
                    ` : ''}
                    <div class="popup-services">
                        <div class="services-title">Servicios</div>
                        <div class="services-grid">
                            <div class="service-item ${apVacuna === 'Si' ? 'available' : 'unavailable'}">
                                ${apVacuna === 'Si' ? '✓' : '✗'} Vacunas generales
                            </div>
                            <div class="service-item ${apVacunaMenor === 'Si' ? 'available' : 'unavailable'}">
                                ${apVacunaMenor === 'Si' ? '✓' : '✗'} Vacunas menores
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
                    <h4>No se encontraron resultados</h4>
                    <p>Prueba modificando los filtros de búsqueda</p>
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
                <span class="counter-text">resultado${vacunatorios.length !== 1 ? 's' : ''}</span>
            </div>
        `;
        container.appendChild(counterDiv);

        const itemsToShow = Math.min(vacunatorios.length, 30);
        const fragment = document.createDocumentFragment();

        for (let i = 0; i < itemsToShow; i++) {
            const vacunatorio = vacunatorios[i];
            const card = this.createVacunatorioCard(vacunatorio, i);
            fragment.appendChild(card);
        }

        container.appendChild(fragment);

        if (vacunatorios.length > itemsToShow) {
            const moreDiv = document.createElement('div');
            moreDiv.className = 'more-results';
            moreDiv.innerHTML = `
                <p>Mostrando ${itemsToShow} de ${vacunatorios.length} resultados.
                Usa los filtros para refinar la búsqueda.</p>
            `;
            container.appendChild(moreDiv);
        }
    }

    createVacunatorioCard(vacunatorio) {
        const nombre = vacunatorio.nombre || vacunatorio.Nombre || 'Sin nombre';
        const tipo = vacunatorio.tipo || vacunatorio.Tipo || 'Centro de Salud';
        const domicilio = vacunatorio.domicilio || vacunatorio.Domicilio || '';
        const localidad = vacunatorio.localidad || vacunatorio.Localidad || '';
        const provincia = vacunatorio.provincia || vacunatorio.Provincia || '';
        const telefono = vacunatorio.telefono || vacunatorio.Telefono || '';
        const apVacuna = vacunatorio.apVacuna || vacunatorio['Ap.Vacuna'] || 'No';
        const apVacunaMenor = vacunatorio.apVacunaMenor || vacunatorio['Ap.Vacuna Menor'] || 'No';

        const card = document.createElement('div');
        card.className = 'card-vacunatorio';
        card.innerHTML = `
            <div class="card-header">
                <div class="card-icon">${this.getMarkerIcon(tipo)}</div>
                <div class="card-title-section">
                    <h4 class="card-titulo">${nombre}</h4>
                    <span class="card-tipo">${tipo}</span>
                </div>
            </div>
            <div class="card-content">
                <div class="card-info">
                    <div class="info-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#7666EA">
                            <path d="M12,2C15.31,2 18,4.66 18,7.95C18,12.41 12,22 12,22S6,12.41 6,7.95C6,4.66 8.69,2 12,2M12,6A2,2 0 0,0 10,8A2,2 0 0,0 12,10A2,2 0 0,0 14,8A2,2 0 0,0 12,6Z"/>
                        </svg>
                        <div>
                            <div class="info-primary">${domicilio}</div>
                            <div class="info-secondary">${localidad}, ${provincia}</div>
                        </div>
                    </div>
                    ${telefono ? `
                        <div class="info-item">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="#7666EA">
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
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12,2C15.31,2 18,4.66 18,7.95C18,12.41 12,22 12,22S6,12.41 6,7.95C6,4.66 8.69,2 12,2M12,6A2,2 0 0,0 10,8A2,2 0 0,0 12,10A2,2 0 0,0 14,8A2,2 0 0,0 12,6Z"/>
                    </svg>
                    Ver en mapa
                </button>
            </div>
        `;
        card.addEventListener('click', () => this.handleCardClick(card, nombre), { passive: true });
        return card;
    }

    handleCardClick(card, nombre) {
        const targetMarker = this.markers.find(marker => {
            const popup = marker.getPopup();
            return popup && popup.getContent().includes(nombre);
        });

        if (targetMarker) {
            document.querySelectorAll('.card-vacunatorio.selected').forEach(c => {
                c.classList.remove('selected');
            });

            card.classList.add('selected');
            targetMarker.openPopup();

            setTimeout(() => {
                card.classList.remove('selected');
            }, 3000);
        }
    }
    saveCoordinatesToCache(data) {
        const cacheData = {
            timestamp: Date.now(),
            data: data,
            version: 3
        };
        try {
            localStorage.setItem(this.COORDINATES_CACHE_KEY, JSON.stringify(cacheData));
        } catch (error) {
            console.error('Error guardando en caché:', error);
            this.clearOldCache();
        }
    }

    getCoordinatesFromCache() {
        try {
            const cached = localStorage.getItem(this.COORDINATES_CACHE_KEY);
            if (!cached) return null;

            const { timestamp, data, version } = JSON.parse(cached);

            if (version !== 3) {
                localStorage.removeItem(this.COORDINATES_CACHE_KEY);
                return null;
            }

            const isExpired = Date.now() - timestamp > this.CACHE_EXPIRY;
            if (isExpired) {
                localStorage.removeItem(this.COORDINATES_CACHE_KEY);
                return null;
            }

            return data;
        } catch (error) {
            console.error('Error recuperando caché:', error);
            return null;
        }
    }

    clearOldCache() {
        try {
            localStorage.removeItem('vacunatorios_cache_v1');
            localStorage.removeItem('vacunatorios_cache_v2');
            localStorage.removeItem('coordinates_cache_v1');
            localStorage.removeItem('coordinates_cache_v2');
        } catch (error) {
            console.error('Error limpiando caché:', error);
        }
    }

    loadTileLayer() {
        const provider = this.tileProviders[this.currentTileProviderIndex];

        if (this.currentTileLayer) {
            this.map.removeLayer(this.currentTileLayer);
        }

        this.currentTileLayer = L.tileLayer(provider.url, provider.options);
        this.currentTileLayer.addTo(this.map);
    }

    clearMarkers() {
        if (this.markers.length > 0) {
            this.markers.forEach(marker => this.map.removeLayer(marker));
            this.markers = [];
        }
    }

    getMarkerIcon(tipo) {
        const icons = {
            'Hospital': '🏥',
            'Farmacia': '💊',
            'Centro de Salud': '⚕️'
        };
        return icons[tipo] || icons['Centro de Salud'];
    }

    initFilters() {
        const searchInput = document.getElementById('inputBusqueda');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(() => this.filterVacunatorios(), 300), { passive: true });
        }

        const provinciaFilter = document.getElementById('filtroProvincia');
        if (provinciaFilter) {
            provinciaFilter.addEventListener('change', (e) => {
                this.filters.provincia = e.target.value;
                this.updateLocalidadesFilter();
                this.filterVacunatorios();
            }, { passive: true });
        }

        const localidadFilter = document.getElementById('filtroLocalidad');
        if (localidadFilter) {
            localidadFilter.addEventListener('change', (e) => {
                this.filters.localidad = e.target.value;
                this.filterVacunatorios();
            }, { passive: true });
        }

        const vacunaFilter = document.getElementById('filtroVacunas');
        if (vacunaFilter) {
            vacunaFilter.addEventListener('change', (e) => {
                this.filters.apVacuna = e.target.checked;
                this.filterVacunatorios();
            }, { passive: true });
        }

        const menorFilter = document.getElementById('filtroMenores');
        if (menorFilter) {
            menorFilter.addEventListener('change', (e) => {
                this.filters.apVacunaMenor = e.target.checked;
                this.filterVacunatorios();
            }, { passive: true });
        }
    }

    async loadVacunatoriosOriginal() {
        const cachedData = this.getFromCache();
        if (cachedData) {
            this.vacunatorios = cachedData;
            this.initFilterOptions();
            this.filterVacunatorios();
            return;
        }

        try {
            await this.loadFromGoogleSheets();
            this.saveToCache(this.vacunatorios);
        } catch (error) {
            try {
                await this.loadFromLocalCSV();
                this.saveToCache(this.vacunatorios);
            } catch (localError) {
                this.loadHardcodedData();
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
            }
        ];
    }

    saveToCache(data) {
        const cacheData = {
            timestamp: Date.now(),
            data: data,
            version: 3
        };
        try {
            localStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData));
        } catch (error) {
            console.error('Error guardando en caché:', error);
        }
    }

    getFromCache() {
        try {
            const cached = localStorage.getItem(this.CACHE_KEY);
            if (!cached) return null;

            const { timestamp, data, version } = JSON.parse(cached);

            if (version !== 3) {
                localStorage.removeItem(this.CACHE_KEY);
                return null;
            }

            const isExpired = Date.now() - timestamp > this.CACHE_EXPIRY;
            if (isExpired) {
                localStorage.removeItem(this.CACHE_KEY);
                return null;
            }

            return data;
        } catch (error) {
            console.error('Error recuperando caché:', error);
            return null;
        }
    }

    async forceRefresh() {
        console.log('Refrescando datos...');
        this.clearOldCache();
        localStorage.removeItem(this.CACHE_KEY);
        localStorage.removeItem(this.COORDINATES_CACHE_KEY);
        localStorage.removeItem(this.PRELOAD_CACHE_KEY);
        await this.loadVacunatoriosWithCoordinates();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMap);
    } else {
        setTimeout(initMap, 0);
    }

    function initMap() {
        try {
            const vacunatoriosMap = new VacunatoriosMapOptimized();
            window.vacunatoriosMapInstance = vacunatoriosMap;
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
                const container = document.getElementById('listaResultados');
                if (container) {
                    container.innerHTML = `
                        <div class="sin-resultados">
                            <h4>Error cargando datos</h4>
                            <p>Por favor, recarga la página</p>
                        </div>
                    `;
                }
            });
        } catch (error) {
            console.error('Error en initMap:', error);
        }
    }
});

function seleccionarVacunatorio(id) {
    console.log('Seleccionando vacunatorio:', id);
}

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(err => {
        console.log('Service Worker registration failed: ', err);
    });
}

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        const map = window.vacunatoriosMapInstance;
        if (map) {
            map.preloadInBackground();
        }
    }
});

window.VacunatoriosMapOptimized = VacunatoriosMapOptimized;
