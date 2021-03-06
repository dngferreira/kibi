describe('params', function () {
  let _ = require('lodash');
  let moment = require('moment');
  let expect = require('expect.js');
  let ngMock = require('ngMock');

  let paramWriter;
  let writeInterval;

  let aggTypes;
  let AggConfig;
  let setTimeBounds;
  let timeField;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private, $injector) {
    let AggParamWriter = Private(require('../../AggParamWriter'));
    let indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
    let timefilter = $injector.get('timefilter');

    timeField = indexPattern.timeFieldName;
    aggTypes = Private(require('ui/agg_types/index'));
    AggConfig = Private(require('ui/Vis/AggConfig'));

    paramWriter = new AggParamWriter({ aggType: 'date_histogram' });
    writeInterval = function (interval) {
      return paramWriter.write({ interval: interval, field: timeField });
    };

    let now = moment();
    setTimeBounds = function (n, units) {
      timefilter.enabled = true;
      timefilter.getBounds = _.constant({
        min: now.clone().subtract(n, units),
        max: now.clone()
      });
    };
  }));

  describe('interval', function () {
    it('accepts a valid interval', function () {
      let output = writeInterval('d');
      expect(output.params).to.have.property('interval', '1d');
    });

    it('ignores invalid intervals', function () {
      let output = writeInterval('foo');
      expect(output.params).to.have.property('interval', '0ms');
    });

    it('automatically picks an interval', function () {
      setTimeBounds(15, 'm');
      let output = writeInterval('auto');
      expect(output.params.interval).to.be('30s');
    });

    it('scales up the interval if it will make too many buckets', function () {
      setTimeBounds(30, 'm');
      let output = writeInterval('s');
      expect(output.params.interval).to.be('10s');
      expect(output.metricScaleText).to.be('second');
      expect(output.metricScale).to.be(0.1);
    });

    it('does not scale down the interval', function () {
      setTimeBounds(1, 'm');
      let output = writeInterval('h');
      expect(output.params.interval).to.be('1h');
      expect(output.metricScaleText).to.be(undefined);
      expect(output.metricScale).to.be(undefined);
    });

    describe('only scales when all metrics are sum or count', function () {
      let tests = [
        [ false, 'avg', 'count', 'sum' ],
        [ true, 'count', 'sum' ],
        [ false, 'count', 'cardinality' ]
      ];

      tests.forEach(function (test) {
        let should = test.shift();
        let typeNames = test.slice();

        it(typeNames.join(', ') + ' should ' + (should ? '' : 'not') + ' scale', function () {
          setTimeBounds(1, 'y');

          let vis = paramWriter.vis;
          vis.aggs.splice(0);

          let histoConfig = new AggConfig(vis, {
            type: aggTypes.byName.date_histogram,
            schema: 'segment',
            params: { interval: 's', field: timeField }
          });

          vis.aggs.push(histoConfig);

          typeNames.forEach(function (type) {
            vis.aggs.push(new AggConfig(vis, {
              type: aggTypes.byName[type],
              schema: 'metric'
            }));
          });

          let output = histoConfig.write();
          expect(_.has(output, 'metricScale')).to.be(should);
        });
      });
    });
  });

  describe('extended_bounds', function () {
    it('should write a long value if a moment passed in', function () {
      let then = moment(0);
      let now = moment(500);
      let output = paramWriter.write({
        extended_bounds: {
          min: then,
          max: now
        }
      });

      expect(typeof output.params.extended_bounds.min).to.be('number');
      expect(typeof output.params.extended_bounds.max).to.be('number');
      expect(output.params.extended_bounds.min).to.be(then.valueOf());
      expect(output.params.extended_bounds.max).to.be(now.valueOf());


    });

    it('should write a long if a long is passed', function () {
      let then = 0;
      let now = 500;
      let output = paramWriter.write({
        extended_bounds: {
          min: then,
          max: now
        }
      });

      expect(typeof output.params.extended_bounds.min).to.be('number');
      expect(typeof output.params.extended_bounds.max).to.be('number');
      expect(output.params.extended_bounds.min).to.be(then.valueOf());
      expect(output.params.extended_bounds.max).to.be(now.valueOf());


    });
  });
});
