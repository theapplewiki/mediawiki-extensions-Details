/**
 * Updates the state of the collapsible after it has been toggled.
 *
 * @param {JQuery<HTMLElement>} $toggle Toggle button to update
 * @param {JQuery<HTMLDetailsElement>} $details Overall `<details>` element
 * @param {DetailsOptions} options Collapsible options
 */
function handleToggled( $toggle, $details, options ) {
	const open = $details[ 0 ].open;
	$details.toggleClass( 'mw-collapsed', !open );
	$toggle
		.attr( 'aria-expanded', String( open ) )
		.toggleClass( 'mw-collapsible-toggle-collapsed', !open )
		.find( '.mw-collapsible-text' )
		.text( open ? options.toggleText.collapseText : options.toggleText.expandText );
}

/**
 * Creates a toggle button for the collapsible.
 *
 * @param {DetailsOptions} options Collapsible options
 * @return {JQuery<HTMLElement>}
 */
function makeToggle( options ) {
	return $( '<span>' )
		.addClass( [ 'mw-collapsible-toggle', 'mw-collapsible-toggle-default' ] )
		.attr( {
			role: 'presentation',
			'aria-hidden': 'true'
		} )
		.append( $( '<span>' )
			.addClass( 'mw-collapsible-text' )
			.text( options.toggleText.collapseText ) );
}

/**
 * Enhances a `<details>` element with collapsible functionality.
 *
 * @param {HTMLDetailsElement} el The `<details>` to enhance.
 */
function makeCollapsible( el ) {
	const $details = $( el );

	if ( $details.data( 'mw-made-collapsible' ) ) {
		// Already done
		return;
	}

	const options = /** @type {DetailsOptions} */ ( {
		toggleText: {
			expandText: $details.attr( 'data-expandtext' ) || mw.msg( 'collapsible-expand' ),
			collapseText: $details.attr( 'data-collapsetext' ) || mw.msg( 'collapsible-collapse' )
		}
	} );

	let $summary = $details
		.find( '> summary' )
		.first();
	if ( $summary.length === 0 ) {
		// Make our own
		$summary = $( '<summary>' )
			.prependTo( $details );
	}

	const collapsible = {
		collapse: () => {
			el.open = false;
		},
		expand: () => {
			el.open = true;
		},
		toggle: () => {
			el.open = !el.open;
		}
	};

	// Add mw-collapsible compatible classes and API
	$details
		.data( 'mw-made-collapsible', true )
		.data( 'mw-collapsible', collapsible )
		.addClass( 'mw-collapsible mw-made-collapsible' );

	// If the user added non-semantic class="mw-collapsed", close it for them
	// eslint-disable-next-line no-jquery/no-class-state
	if ( $details.hasClass( 'mw-collapsed' ) && el.open ) {
		el.open = false;
	}

	// Find where we need to put the toggle link
	let $toggle = $summary
		.find( '> .mw-collapsible-toggle' )
		.first();
	const $placeholder = $summary
		.find( '> .mw-collapsible-toggle-placeholder' )
		.first();

	if ( $placeholder.length > 0 ) {
		// Replace placeholder with a real toggle
		$toggle = makeToggle( options );
		$placeholder.replaceWith( $toggle );
	} else if ( $toggle.length === 0 ) {
		// Make our own
		$toggle = makeToggle( options )
			.prependTo( $summary );
	}

	// Set up toggle state
	handleToggled( $toggle, $details, options );

	$details.on( 'toggle', ( e ) => {
		// In case the element is cloned, we need to find the correct matching toggle
		const $firstToggle = $( e.target )
			.find( '> summary .mw-collapsible-toggle' )
			.first();
		handleToggled( $firstToggle, $details, options );
	} );

	// Fire hook to be compatible with jquery.makeCollapsible.js
	mw.hook( 'wikipage.collapsibleContent' )
		.fire( el );
}

/**
 * Expands a collapsed `<details>` element containing the hash fragment in browsers that don’t do this automatically.
 */
function handleHashChange() {
	const fragment = mw.util.getTargetFromFragment();
	if ( !fragment ) {
		// The fragment doesn't exist
		return;
	}

	const $parents = /** @type {JQuery<HTMLDetailsElement>} */ ( $( fragment ).parents( 'details:not([open])' ) );
	if ( !$parents.length ) {
		// The fragment is not in a collapsed element
		return;
	}

	// Expand collapsed parents
	$parents.each( ( _, el ) => {
		el.open = true;
	} );

	// Scroll to the fragment
	fragment.scrollIntoView();
}

mw.hook( 'wikipage.content' )
	.add( () => {
		// Make sure the browser supports <details> toggle event, if not, we’ll gracefully degrade
		const test = document.createElement( 'details' );
		if ( !( 'ontoggle' in test ) ) {
			$( document.documentElement )
				.addClass( 'details--not-available' );
			return;
		}

		// Set up details elements
		// eslint-disable-next-line no-jquery/no-global-selector
		$( '.details--root:not(.mw-made-collapsible)' )
			.each( ( _, el ) => makeCollapsible( /** @type {HTMLDetailsElement} */ ( el ) ) );

		// Handle hashchange if browser doesn’t support hidden-until-found
		if ( !( 'onbeforematch' in document.body ) ) {
			handleHashChange();
			$( window ).on( 'hashchange', handleHashChange );
		}
	} );
