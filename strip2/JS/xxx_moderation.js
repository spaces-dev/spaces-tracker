import module from 'module';
import {Spaces, Codes} from './spacesLib';
import $ from './jquery';
import page_loader from './ajaxify';

let last_api_req;

function focus2container() {
	document.getElementById( 'xxx_moderation' ).focus();
	document.getElementById( 'xxx_moderation' ).dispatchEvent( new Event( 'click' ) );
}

function initModule() {
	let offset = 0;
	
	page_loader.push('shutdown', () => {
		if (last_api_req)
			Spaces.cancelApi(last_api_req);
		last_api_req = false;
	});
	
	const container = document.getElementById( 'xxx_moderation' );
	const moreBtn = container.getElementsByTagName( 'BUTTON' )[ 0 ];
	moreBtn.addEventListener( 'click', function ( ev ) {
		
		this.disabled = true;
		this.innerText = 'Загрузка...';
		
		const items = container.getElementsByClassName( 'xxx_moderation_item' );
		for ( let q = 0; q < items.length; q++ ) {
			if ( items[ q ].dataset.status != container.dataset.status ) {
				items[ q ].parentElement.remove();
				q--;
			}
		}
		
		if (last_api_req)
			Spaces.cancelApi(last_api_req);
		
		let api_method, api_params;
		
		api_method = "xxx.moderation_list";
		api_params = {
			Type: container.dataset.type,
			Status: container.dataset.status,
			Offset: offset,
			//Limit: 20
		};
		
		last_api_req = Spaces.api(api_method, api_params, (res) => {
			last_api_req = false;
			
			if (res.code != 0) {
				console.error('[xxx_moderation] ' + Spaces.apiError(res));
				return;
			}
			
			offset = res.offset;
			
			const old_cnt = container.getElementsByClassName( 'xxx_moderation_item' ).length;
			
			//moreBtn.insertAdjacentHTML( 'beforebegin', res.items );
			$( moreBtn ).before( res.items );
			
			if ( container.getElementsByClassName( 'xxx_moderation_item' ).length > old_cnt )
				container.getElementsByClassName( 'xxx_moderation_item' )[old_cnt].parentElement.scrollIntoView( true );
			
			for ( let item of container.getElementsByClassName( 'xxx_moderation_item' ) )
				initItem( item );
			
			this.disabled = false;
			this.innerText = 'Ещё';
		}, {
			onError(err) {
				console.error('[xxx_moderation] ' + err);
				last_api_req = false;
			}
		});
		
		ev.preventDefault();
		focus2container();
		return false;
	} );
	
	container.addEventListener( 'keyup', ( ev ) => { if(ev.code in ["PageDown","PageUp"]) ev.preventDefault(); } );
	container.addEventListener( 'keydown', function ( ev ) {
		const move_by = { PageDown: +1, PageUp: -1}[ ev.code ];
		if ( !move_by )
			return;
		
		const items = container.getElementsByClassName( 'xxx_moderation_item' );
		if ( !items.length )
			return;
		
		let cur_item_index = 0;
		for ( let q = 1; q < items.length; q++ )
			if ( Math.abs( items[ cur_item_index ].getBoundingClientRect().y ) > Math.abs( items[ q ].getBoundingClientRect().y ) )
				cur_item_index = q;
		
		cur_item_index += move_by;
		if ( cur_item_index < 0 || cur_item_index > items.length - 1 )
			return;
		
		items[ cur_item_index ].parentElement.scrollIntoView( true );
		
		ev.preventDefault();
	} );
	moreBtn.dispatchEvent( new Event( 'click' ) );
}

function render( item ) {
	for ( let btn of item.getElementsByClassName( 'status_set_btn' ) ) {
		if ( item.dataset.status === btn.dataset.status ) {
			btn.classList.remove( 'status_set_btn_avail' );
			btn.classList.add( 'status_set_btn_current' );
		} else {
			btn.classList.add( 'status_set_btn_avail' );
			btn.classList.remove( 'status_set_btn_current' );
		}
	}
	
	//document.getElementById( `decline_UI_${item.dataset.fileId}` ).style.display = item.dataset.curSubBlock === 'decline' ? 'block' : 'none';
	
	let block = document.getElementById( `block_UI_${item.dataset.fileId}` );
	block.style.display = (item.dataset.curSubBlock === 'block' ? 'block' : 'none');
}

function initItem( item ) {
	
	if ( item.dataset.inited )
		return;
	item.dataset.inited = true;
	
	let block = document.getElementById( `block_UI_${item.dataset.fileId}` );
	if (!block)
		return;
	
	render( item );
	
	let cats = item.dataset.cats.split( ' ' ).filter(_ => _.length);
	
	for ( let cat of cats ) {
		document.getElementById( `cat_remove_btn_${item.dataset.fileId}_${cat}` ).addEventListener( 'click', function ( ev ) {
			
			this.disabled = true;
			
			const nextCats = cats.filter( _ => _ != cat );
			
			Spaces.api(
				"xxx.file.cats",
				{
					File_id: item.dataset.fileId,
					Ftype: item.dataset.fileType,
					CK: null,
					CaT: nextCats,
				},
				res => {
					if ( res.code != 0 )
						Spaces.showApiError( res );
					else
						document.getElementById( `cat_container_${item.dataset.fileId}_${cat}` ).remove();
					
					cats = nextCats;
					this.disabled = false;
				}
			);
			
			ev.preventDefault();
			focus2container();
			return false;
		} );
	}
	
	document.getElementById( `show_${item.dataset.fileId}_edit_cats_form_btn` ).addEventListener( 'click', function ( ev ) {
		document.getElementById( `short_${item.dataset.fileId}_cats` ).style.display = 'none';
		document.getElementById( `${item.dataset.fileId}_edit_cats_form` ).style.display = 'block';
		
		ev.preventDefault();
		focus2container();
		return false;
	} );
	
	document.getElementById( `accept_${item.dataset.fileId}_btn` ).addEventListener( 'click', function ( ev ) {
		
		item.dataset.curSubBlock = '';
		render( item );
		
		this.disabled = true;
		
		Spaces.api(
			"xxx.moderation_set_decision",
			{
				Type: item.dataset.fileType,
				Id: item.dataset.fileId,
				Status: this.dataset.status,
				CK: null,
			},
			res => {
				this.disabled = false;
				
				if ( res.status )
					item.dataset.status = res.status;
				
				render( item );
			}
		);
		
		ev.preventDefault();
		focus2container();
		return false;
	} );
	
	//document.getElementById(`decline_UI_show_${item.dataset.fileId}_btn`).addEventListener( 'click', function(ev) {
	//	
	//	item.dataset.curSubBlock = 'decline';
	//	render( item );
	//	
	//	ev.preventDefault();
	//	return false;
	//} );
	
	document.getElementById(`block_UI_show_${item.dataset.fileId}_btn`).addEventListener( 'click', function(ev) {
		
		item.dataset.curSubBlock = 'block';
		render( item );
		
		ev.preventDefault();
		return false;
	} );
	
	document.getElementById(`decline_${item.dataset.fileId}_btn`).addEventListener( 'click', function ( ev ) {
		this.disabled = true;
		
		let declineReasons = [];
		for ( let inp of document.getElementById( `decline_UI_${item.dataset.fileId}` ).getElementsByTagName( 'INPUT' ) )
			if ( inp.checked )
				declineReasons.push( inp.value );
		
		if ( declineReasons.length ) {
			Spaces.api(
				"xxx.moderation_set_decision",
				{
					Type: item.dataset.fileType,
					Id: item.dataset.fileId,
					Status: this.dataset.status,
					DeCline_reason: declineReasons,
					CK: null,
				},
				res => {
					this.disabled = false;
					
					if ( res.status )
						item.dataset.status = res.status;
				
					render( item );
				}
			);
		} else
			this.disabled = false;
		
		ev.preventDefault();
		focus2container();
		return false;
	} );
	
	document.getElementById(`block_${item.dataset.fileId}_btn`).addEventListener( 'click', function ( ev ) {
		this.disabled = true;
		
		const blockUI = document.getElementById( `block_UI_${item.dataset.fileId}` );
		
		let banReason, blacklisted = 0;
		for ( let inp of blockUI.getElementsByTagName( 'INPUT' ) ) { 
			if ( inp.checked )
				if ( inp.type === 'radio' )
					banReason = inp.value;
				else if ( inp.type === 'checkbox' )
					blacklisted = 1;
		}
		let ownerBanTime = blockUI.getElementsByTagName('SELECT')[0].value;
		
		
		if ( banReason ) {
			Spaces.api(
				"xxx.moderation_set_decision",
				{
					Type: item.dataset.fileType,
					Id: item.dataset.fileId,
					Status: this.dataset.status,
					Ban_reason: banReason,
					Blacklisted: blacklisted,
					Owner_ban_time: ownerBanTime,
					CK: null,
				},
				res => {
					this.disabled = false;
					
					if ( res.status )
						item.dataset.status = res.status;
				
					render( item );
				}
			);
		}
		
		ev.preventDefault();
		focus2container();
		return false;
	} );
	
}

module.on('componentpage', initModule);

