// vincular.js - Versión minimalista

async function vincularUsuario() {
  alert('[1] OK - Entré a la función');
  
  var codigoInput = document.getElementById('vinc-codigo');
  var codigo = codigoInput ? codigoInput.value.trim() : '';
  
  alert('[2] Código: "' + codigo + '"');
  
  if (!codigo || codigo.length !== 6) {
    alert('[3] Código inválido');
    return;
  }
  
  alert('[3b] Verificando variables globales...');
  alert('    nubeOK_CV = ' + (typeof nubeOK_CV !== 'undefined' ? nubeOK_CV : 'NO EXISTE'));
  alert('    uidCV = ' + (typeof uidCV !== 'undefined' ? uidCV : 'NO EXISTE'));
  alert('    supaCV = ' + (typeof supaCV !== 'undefined' ? 'existe' : 'NO EXISTE'));
  
  if (typeof nubeOK_CV === 'undefined' || !nubeOK_CV) {
    alert('[4] La nube NO está conectada. Activá la nube primero.');
    return;
  }
  
  if (typeof uidCV === 'undefined' || !uidCV) {
    alert('[4b] uidCV es null');
    return;
  }
  
  if (typeof supaCV === 'undefined' || !supaCV) {
    alert('[4c] supaCV no existe');
    return;
  }
  
  alert('[5] Buscando código ' + codigo + ' en la base de datos...');
  
  try {
    var resultado = await supaCV
      .from('codigos_vinculacion')
      .select('*')
      .eq('codigo', codigo)
      .eq('usada', false)
      .limit(1);
    
    alert('[6] Resultado de la búsqueda:');
    alert('    data = ' + JSON.stringify(resultado.data));
    alert('    error = ' + JSON.stringify(resultado.error));
    
    if (resultado.error) {
      alert('[7] Error de Supabase: ' + resultado.error.message);
      return;
    }
    
    if (!resultado.data || resultado.data.length === 0) {
      alert('[7b] Código no encontrado o ya fue usado');
      return;
    }
    
    var codigoData = resultado.data[0];
    alert('[8] Código encontrado. adulto_id: ' + codigoData.adulto_id);
    alert('[9] uidCV actual: ' + uidCV);
    
    alert('[10] Creando el vínculo...');
    var vinculo = await supaCV
      .from('vinculos_familiares')
      .insert({
        adulto_id: codigoData.adulto_id,
        cuidador_id: uidCV,
        nombre_adulto: codigoData.nombre_adulto || 'Usuario'
      });
    
    alert('[11] Resultado del insert:');
    alert('    error = ' + JSON.stringify(vinculo.error));
    
    if (vinculo.error) {
      alert('[12] Error al crear vínculo: ' + vinculo.error.message);
      return;
    }
    
    alert('[13] Marcando código como usado...');
    await supaCV.from('codigos_vinculacion').update({ usada: true }).eq('id', codigoData.id);
    
    alert('[14] ¡VINCULACIÓN EXITOSA! ✅');
    if (codigoInput) codigoInput.value = '';
    
  } catch (e) {
    alert('[ERROR] ' + e.message);
  }
}
