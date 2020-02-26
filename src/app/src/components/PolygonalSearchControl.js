import React from 'react';
import { connect } from 'react-redux';
import { updateBoundariesFilter } from '../actions/filters';
import { FeatureGroup, Polygon, withLeaflet } from 'react-leaflet';
import L from 'leaflet';
import Draw from 'leaflet-draw';
import '../../node_modules/leaflet-draw/dist/leaflet.draw.css';
import { fetchFacilities } from '../actions/facilities';

class PolygonalSearchControl extends React.Component {
    constructor(props) {
        super(props);

        this.onCreate = this.onCreate.bind(this);
    }

    componentDidMount() {
        const map = this.props.leaflet.map;
        const editableLayers = this.refs.drawnItems.leafletElement;
        var drawControl = new L.Control.Draw({
            position: 'topleft',
            edit: {
                featureGroup: editableLayers,
                edit: false,
                remove: false,
            },
            draw: {
                polyline: false,
                rectangle: false,
                circle: false,
                marker: false,
                circlemarker: false,
            }
         });
         map.addControl(drawControl);

         map.on(L.Draw.Event.CREATED, this.onCreate);
    }

    onCreate(e) {
        const boundaries = e.layer._latlngs[0].map(({ lat, lng }) => [lat, lng]);

        if (boundaries.length > 2) {
            this.props.updateBoundaries(boundaries);
        }

        this.props.search();
    }

    render() {
        return (
            <FeatureGroup ref="drawnItems">
                <Polygon positions={this.props.boundaries} />
            </FeatureGroup>
        )
    }
}

const mapStateToProps = ({ filters }) => ({
    boundaries: filters.boundaries,
});

const mapDispatchToProps = dispatch => ({
    updateBoundaries: boundaries => dispatch(updateBoundariesFilter(boundaries)),
    search: () => dispatch(fetchFacilities({})),
});

export default connect(mapStateToProps, mapDispatchToProps)(withLeaflet(PolygonalSearchControl));
