import { coerceBooleanProperty } from '@angular/cdk/coercion';

import {
    ChangeDetectorRef,
    Component,
    inject,
    Input,
    OnChanges,
    OnDestroy,
    OnInit,
    SimpleChanges,
    ViewEncapsulation,
} from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { CSLoadingService } from '@shared/services/loading';
import { Subject, takeUntil } from 'rxjs';

@Component({
    selector: 'csw-loading-bar',
    templateUrl: './loading-bar.component.html',
    styleUrls: ['./loading-bar.component.scss'],
    encapsulation: ViewEncapsulation.None,
    exportAs: 'csLoadingBar',
    standalone: true,
    imports: [MatProgressBarModule],
})
export class CSLoadingBarComponent implements OnChanges, OnInit, OnDestroy {
    private _csLoadingService = inject(CSLoadingService);
    private _changeDetectorRef = inject(ChangeDetectorRef);

    @Input() autoMode = true;
    mode: 'determinate' | 'indeterminate' = 'indeterminate';
    progress = 0;
    show = false;
    private _unsubscribeAll: Subject<void> = new Subject<void>();

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On changes
     *
     * @param changes
     */
    ngOnChanges(changes: SimpleChanges): void {
        // Auto mode
        if ('autoMode' in changes) {
            // Set the auto mode in the service
            this._csLoadingService.setAutoMode(
                coerceBooleanProperty(changes['autoMode'].currentValue)
            );
        }
    }

    /**
     * On init
     */
    ngOnInit(): void {
        // Subscribe to the service
        this._csLoadingService.mode$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((value) => {
                this.mode = value;
                this._changeDetectorRef.markForCheck();
            });

        this._csLoadingService.progress$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((value) => {
                this.progress = value ?? 0;
                this._changeDetectorRef.markForCheck();
            });

        this._csLoadingService.show$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((value) => {
                // Diferir al siguiente tick para evitar NG0100 al abrir/cerrar HTTP
                // en el mismo ciclo de detección (p. ej. diálogo → petición).
                queueMicrotask(() => {
                    this.show = value;
                    this._changeDetectorRef.markForCheck();
                });
            });
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }
}
