const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, 'data/vacunatorios_coordinates.json');
const outputPath = path.join(__dirname, 'data/vacunatorios_coordinates_con_barrios.json');

/**
 * MEJOR ENFOQUE: Analizador inteligente de direcciones argentinas
 *
 * Estrategia:
 * 1. Clasificar cada segmento por tipo (calle, número, barrio, ciudad, etc.)
 * 2. Usar patrones específicos para cada provincia
 * 3. Aplicar reglas de contexto geográfico
 * 4. Fallback inteligente basado en posición y características
 */

class BarrioExtractor {
    constructor() {
        // Patrones para identificar diferentes tipos de segmentos
        this.patterns = {
            // Códigos postales argentinos
            codigoPostal: /^([A-Z]?\d{4,5})$/,

            // Números de dirección
            numero: /^\d+$/,

            // Calles/avenidas
            calle: /^(Av\.|Avenida|Calle|Pasaje|Boulevard|Bv\.|Blvd\.|Ruta|Route|Camino)/i,

            // Términos administrativos que NO son barrios
            administrativo: /^(Municipio|Partido|Departamento|Distrito|Pedanía|Comuna|Provincia)\s+(de\s+)?/i,

            // Países
            pais: /^(Argentina|Chile|Uruguay|Paraguay|Brasil|Bolivia)$/i,

            // Prefijos de barrio
            prefijoBarrio: /^(Barrio|B°|Villa|Pueblo|Conjunto|Complejo|Urbanización)/i
        };

        // Provincias argentinas y sus variantes
        this.provincias = new Set([
            'Buenos Aires', 'Córdoba', 'Santa Fe', 'Mendoza', 'Tucumán',
            'Entre Ríos', 'Salta', 'Chaco', 'Corrientes', 'Misiones',
            'San Juan', 'Jujuy', 'Río Negro', 'Neuquén', 'Formosa',
            'Chubut', 'San Luis', 'Catamarca', 'La Rioja', 'La Pampa',
            'Santa Cruz', 'Tierra del Fuego', 'Ciudad Autónoma de Buenos Aires'
        ]);

        // Ciudades principales por provincia
        this.ciudadesPrincipales = {
            'Buenos Aires': ['La Plata', 'Mar del Plata', 'Bahía Blanca', 'Quilmes', 'Lanús'],
            'Córdoba': ['Córdoba', 'Río Cuarto', 'Villa Carlos Paz', 'Villa María'],
            'Santa Fe': ['Rosario', 'Santa Fe', 'Rafaela', 'Venado Tuerto'],
            'Entre Ríos': ['Paraná', 'Concordia', 'Gualeguaychú', 'Concepción del Uruguay'],
            'Mendoza': ['Mendoza', 'San Rafael', 'Maipú', 'Godoy Cruz'],
            'Tucumán': ['San Miguel de Tucumán', 'Concepción', 'Banda del Río Salí']
        };

        // Términos que indican fin de barrio
        this.terminadores = new Set([
            'Argentina', 'Ciudad Autónoma de Buenos Aires'
        ]);
    }

    /**
     * Clasifica un segmento de la dirección
     */
    clasificarSegmento(segmento, posicion, totalSegmentos) {
        const seg = segmento.trim();

        if (this.patterns.codigoPostal.test(seg)) return 'codigo_postal';
        if (this.patterns.numero.test(seg)) return 'numero';
        if (this.patterns.calle.test(seg)) return 'calle';
        if (this.patterns.administrativo.test(seg)) return 'administrativo';
        if (this.patterns.pais.test(seg)) return 'pais';
        if (this.provincias.has(seg)) return 'provincia';
        if (this.terminadores.has(seg)) return 'terminador';

        // Buscar en ciudades principales
        for (const [provincia, ciudades] of Object.entries(this.ciudadesPrincipales)) {
            if (ciudades.includes(seg)) return 'ciudad';
        }

        // Si empieza con prefijo de barrio, es barrio
        if (this.patterns.prefijoBarrio.test(seg)) return 'barrio';

        // Por posición: primeros elementos tienden a ser direcciones
        if (posicion <= 1) return 'direccion';

        // Últimos elementos tienden a ser administrativos
        if (posicion >= totalSegmentos - 3) return 'administrativo_probable';

        return 'candidato_barrio';
    }

    /**
     * Extrae barrio usando análisis contextual
     */
    extraerBarrio(displayName, provincia, localidad) {
        if (!displayName) return null;

        const segmentos = displayName.split(',').map(s => s.trim());
        const clasificaciones = segmentos.map((seg, i) => ({
            texto: seg,
            posicion: i,
            tipo: this.clasificarSegmento(seg, i, segmentos.length)
        }));

        // Estrategia 1: Buscar segmentos explícitamente marcados como barrio
        const barrioExplicito = clasificaciones.find(c => c.tipo === 'barrio');
        if (barrioExplicito) {
            return barrioExplicito.texto;
        }

        // Estrategia 2: Buscar candidatos a barrio en posición correcta
        const candidatos = clasificaciones.filter(c => c.tipo === 'candidato_barrio');

        // Para Buenos Aires: buscar antes de "Buenos Aires" o "Comuna"
        if (provincia === 'Capital Federal' || provincia === 'Buenos Aires') {
            for (let i = 0; i < clasificaciones.length; i++) {
                const actual = clasificaciones[i];
                if (actual.texto === 'Buenos Aires' || actual.texto.startsWith('Comuna')) {
                    if (i > 0) {
                        const anterior = clasificaciones[i - 1];
                        if (anterior.tipo === 'candidato_barrio') {
                            return anterior.texto;
                        }
                    }
                }
            }
        }

        // Estrategia 3: Buscar antes de la ciudad conocida
        for (let i = 0; i < clasificaciones.length; i++) {
            const actual = clasificaciones[i];
            if (actual.tipo === 'ciudad' || actual.texto === localidad) {
                if (i > 0) {
                    const anterior = clasificaciones[i - 1];
                    if (anterior.tipo === 'candidato_barrio') {
                        return anterior.texto;
                    }
                }
            }
        }

        // Estrategia 4: Buscar antes de términos administrativos
        for (let i = 0; i < clasificaciones.length; i++) {
            const actual = clasificaciones[i];
            if (actual.tipo === 'administrativo') {
                if (i > 0) {
                    const anterior = clasificaciones[i - 1];
                    if (anterior.tipo === 'candidato_barrio') {
                        return anterior.texto;
                    }
                }
            }
        }

        // Estrategia 5: Tomar el primer candidato válido en posición media
        const candidatosPosicionMedia = candidatos.filter(c =>
            c.posicion >= 2 && c.posicion < clasificaciones.length - 2
        );

        if (candidatosPosicionMedia.length > 0) {
            return candidatosPosicionMedia[0].texto;
        }

        // Estrategia 6: Fallback - cualquier candidato disponible
        if (candidatos.length > 0) {
            return candidatos[0].texto;
        }

        return null;
    }

    /**
     * Procesa el archivo completo
     */
    procesarArchivo() {
        try {
            console.log('🔍 Cargando archivo...');
            const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

            console.log(`📊 Procesando ${data.data.length} registros...`);

            let stats = {
                total: 0,
                conBarrio: 0,
                sinBarrio: 0,
                porProvincia: {},
                ejemplosAnalisis: []
            };

            data.data = data.data.map((vac, index) => {
                stats.total++;

                // Contar por provincia
                if (!stats.porProvincia[vac.provincia]) {
                    stats.porProvincia[vac.provincia] = { total: 0, conBarrio: 0 };
                }
                stats.porProvincia[vac.provincia].total++;

                const barrio = this.extraerBarrio(vac.displayName, vac.provincia, vac.localidad);

                if (barrio) {
                    stats.conBarrio++;
                    stats.porProvincia[vac.provincia].conBarrio++;
                } else {
                    stats.sinBarrio++;

                    // Guardar algunos ejemplos para análisis
                    if (stats.ejemplosAnalisis.length < 20) {
                        stats.ejemplosAnalisis.push({
                            id: vac.id,
                            provincia: vac.provincia,
                            localidad: vac.localidad,
                            displayName: vac.displayName
                        });
                    }
                }

                // Mostrar progreso cada 1000 registros
                if (index % 1000 === 0) {
                    console.log(`   Procesados: ${index}/${data.data.length}`);
                }

                return { ...vac, barrio };
            });

            // Guardar archivo
            fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf8');

            // Mostrar estadísticas detalladas
            this.mostrarEstadisticas(stats);

            console.log('\n✅ Archivo generado exitosamente:', outputPath);

        } catch (error) {
            console.error('❌ Error:', error.message);
            console.error(error.stack);
        }
    }

    /**
     * Muestra estadísticas detalladas
     */
    mostrarEstadisticas(stats) {
        console.log('\n📈 === ESTADÍSTICAS DETALLADAS ===');
        console.log(`Total procesados: ${stats.total}`);
        console.log(`✅ Con barrio: ${stats.conBarrio} (${(stats.conBarrio/stats.total*100).toFixed(1)}%)`);
        console.log(`❌ Sin barrio: ${stats.sinBarrio} (${(stats.sinBarrio/stats.total*100).toFixed(1)}%)`);

        console.log('\n🗺️  Por provincia:');
        Object.entries(stats.porProvincia)
            .sort(([,a], [,b]) => b.total - a.total)
            .forEach(([provincia, datos]) => {
                const porcentaje = (datos.conBarrio/datos.total*100).toFixed(1);
                console.log(`  ${provincia}: ${datos.conBarrio}/${datos.total} (${porcentaje}%)`);
            });

        if (stats.ejemplosAnalisis.length > 0) {
            console.log('\n🔍 Ejemplos sin barrio para análisis:');
            stats.ejemplosAnalisis.slice(0, 10).forEach(ejemplo => {
                console.log(`  [${ejemplo.provincia}] ${ejemplo.displayName}`);
            });
        }
    }
}

// Ejecutar el extractor
const extractor = new BarrioExtractor();
extractor.procesarArchivo();
