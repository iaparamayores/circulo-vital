// Archivo vincular.js - Sistema de vinculación aislado

async function vincularUsuario() {
  alert('[1] Botón clickeado OK');
  
  const codigoInput = document.getElementById('vinc-codigo');
  const codigo = codigoInput ? codigoInput.value.trim() : '';
  
  if (!codigo || codigo.length !== 6) {
    alert('[2] Código inválido: "' + codigo + '"');
    return;
  }
  
  alert('[3] Código: ' + codigo + ' | uidCV: ' + (typeof uidCV !== 'undefined' ? uidCV : 'NO EXISTE'));
  
  if (typeof nubeOK_CV === 'undefined' || !nubeOK_CV) {
    alert('[4] Nube no conectada. nubeOK_CV = ' + nubeOK_CV);
    return;
  }
  
  if (typeof uidCV === 'undefined' || !uidCV) {
    alert('[4b] uidCV es null o undefined');
    return;
  }
  
  if (typeof supaCV === 'undefined' || !supaCV) {
    alert('[4c] supaCV no existe');
    return;
  }
  
  alert('[5] Buscando código ' + codigo + ' en BD...');
  
  try {
    const { data: codigos, error } = await supaCV
      .from('codigos_vinculacion')
      .select('*')
      .eq('codigo', codigo)
      .eq('usada', false)
      .limit(1);
    
    alert('[6] Resultado: ' + JSON.stringify({ codigos: codigos, error: error }));
    
    if (error) { alert('[7] Error BD: ' + error.message); return; }
    if (!codigos || codigos.length === 0) { alert('[7b] Código no encontrado o ya usado'); return; }
    
    const codigoData = codigos[0];
    alert('[8] Código encontrado. adulto_id: ' + codigoData.adulto_id);
    
    alert('[9] Creando vínculo...');
    const { error: errorVinculo } = await supaCV
      .from('vinculos_familiares')
      .insert({
        adulto_id: codigoData.adulto_id,
        cuidador_id: uidCV,
        nombre_adulto: codigoData.nombre_adulto || 'Usuario'
      });
    
    alert('[10] Resultado insert: ' + JSON.stringify(errorVinculo));
    
    if (errorVinculo) { alert('[11] Error al crear vínculo: ' + errorVinculo.message); return; }
    
    await supaCV.from('codigos_vinculacion').update({ usada: true }).eq('id', codigoData.id);
    
    alert('[12] ¡VINCULACIÓN EXITOSA!');
    if (codigoInput) codigoInput.value = '';
    
  } catch (e) {
    alert('[ERROR] ' + e.message);
  }
}

// Conectar el botón cuando cargue la página
window.addEventListener('load', function() {
  setTimeout(function() {
    const btn = document.getElementById('btn-vincular');
    if (btn) {
      btn.addEventListener('click', vincularUsuario);
      console.log('[vincular.js] Botón conectado OK');
    } else {
      console.log('[vincular.js] ERROR: no se encontró btn-vincular');
    }
  }, 1000);
});